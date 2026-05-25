const puppeteer = require('puppeteer');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeTrainerCards() {
    console.log('啟動瀏覽器 (訓練家卡模式)...');
    const browser = await puppeteer.launch({ headless: true }); 
    const page = await browser.newPage();

    // =========================================================
    // 第一階段：過濾並收集「訓練家卡」連結
    // =========================================================
    console.log('\n--- 開始第一階段：收集訓練家卡連結 ---');
    await page.goto('https://asia.pokemon-card.com/tw/card-search/list/', { waitUntil: 'networkidle2' });

    try {
        console.log('等待搜尋表單載入...');
        
        // ⚠️ 替換點 T1：請確認「訓練家卡」的真實 label for 屬性
        const trainerTypeSelector = 'label[for="Trainers"]'; 
        
        await page.waitForSelector(trainerTypeSelector, { timeout: 10000 });
        console.log('選擇卡牌類型：訓練家卡...');
        await page.click(trainerTypeSelector);
        await delay(500); 

        // 勾選標準賽制
        const standardCheckboxSelector = '.regulation'; 
        await page.waitForSelector(standardCheckboxSelector, { timeout: 10000 });
        console.log('勾選標準賽制...');
        await page.click(standardCheckboxSelector);

        // 點擊搜尋按鈕
        const searchButtonSelector = '.spSearchButton'; 
        console.log('點擊搜尋按鈕並等待跳轉...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
            page.click(searchButtonSelector)
        ]);

        console.log('等待卡牌列表渲染...');
        await page.waitForSelector('a[href*="/tw/card-search/detail/"]', { timeout: 15000 });
        await delay(1500); 

    } catch (error) {
        console.error('❌ 模擬點擊失敗：', error.message);
        await browser.close();
        return; 
    }

    let cardDetailUrls = [];
    let hasNextPage = true;
    let pageNum = 1;
    let lastPageFirstUrl = '';

    while (hasNextPage) {
        console.log(`正在掃描第 ${pageNum} 頁...`);
        
        const urlsOnPage = await page.evaluate(() => {
            const links = document.querySelectorAll('a[href*="/tw/card-search/detail/"]');
            return Array.from(new Set(Array.from(links).map(link => link.href)));
        });

        if (urlsOnPage.length === 0 || urlsOnPage[0] === lastPageFirstUrl) {
            console.log(`\n🛑 發現重複資料，判定已達最後一頁！`);
            break; 
        }
        
        lastPageFirstUrl = urlsOnPage[0]; 
        cardDetailUrls.push(...urlsOnPage);
        console.log(`第 ${pageNum} 頁找到 ${urlsOnPage.length} 張卡牌，目前共收集 ${cardDetailUrls.length} 個連結。`);
        
        // 翻頁邏輯
        const nextButton = await page.$('li.paginationItem.next:not(.disabled)'); 
        if (nextButton && hasNextPage) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
                nextButton.click()
            ]);
            await page.waitForSelector('a[href*="/tw/card-search/detail/"]', { timeout: 10000 }).catch(() => {});
            await delay(1500); 
            pageNum++;
        } else {
            hasNextPage = false;
        }
    }
    
    // =========================================================
    // 第二階段：進入詳細頁面深度抓取
    // =========================================================
    console.log('\n--- 開始第二階段：深度抓取訓練家卡數值 ---');

    for (let i = 0; i < cardDetailUrls.length; i++) {
        const url = cardDetailUrls[i];
        console.log(`[${i + 1}/${cardDetailUrls.length}] 正在分析: ${url}`);
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('.cardDetailPage', { timeout: 10000 });

            const cardDetails = await page.evaluate(() => {
                // 1. 卡牌名稱
                const headerElement = document.querySelector('.pageHeader.cardDetail');
                let name = '';
                if (headerElement) {
                    // 如果訓練家卡名字旁也有不想要的標籤(例如: 物品/支援者圖示)，可用 cloneNode 技巧去除
                    // 這裡先保留最直接的抓法，有需要可以加回 .remove() 邏輯
                    name = headerElement.innerText.trim();
                }

                // 2. 卡牌子類型 (物品、支援者、寶可夢道具、競技場)
                // ⚠️ 替換點 T2：請確認訓練家子類型的真實 class
                const subType = document.querySelector('.commonHeader')?.innerText.trim() || '訓練家卡';

                // ✨ 3. ACE SPEC 判斷邏輯 (取代原本的效果文字)
                const aceSpecList = [
                    "不公印章", "覺醒戰鼓", "急進開關", "危險光線", "高級香氛", 
                    "頂尖捕捉器", "貴重手推車", "寶可生機劑A", "寶可夢旋風回收機", "重新啟動箱", 
                    "璀璨結晶", "奢華炸彈", "英雄斗篷", "極限腰帶", "富裕能量", 
                    "古舊能量", "釣竿MAX", "珍寶配件", "中立中心", "奇跡耳麥", "希望護身符", 
                    "能量輸送PRO", "百萬噸吹風機", "完全體攪拌器", "壯偉碩木", "倖存鍛鍊器", "新沖天能量", "大師球"
                ];
                
                // 使用 Array.includes 判斷抓下來的名稱是否在這個清單內，回傳 true 或 false
                const isAceSpec = aceSpecList.includes(name);

                // 4. 共用資訊
                const imageUrl = document.querySelector('.cardImage img')?.src || document.querySelector('.cardImage')?.src || '';
                const regulationMark = document.querySelector('.alpha')?.innerText.trim() || '';

                return {
                    name,
                    type: 'Trainer', // 大分類固定為 Trainer
                    subType, // 物品 / 支援者 / 競技場 等
                    isAceSpec, // ✨ 寫入是否為 ACE SPEC (布林值)
                    regulationMark,
                    imageUrl,
                    sourceUrl: window.location.href
                };
            });

            // ✨ 新增：使用 upsert 直接寫入資料庫
            await prisma.card.upsert({
                where: { sourceUrl: cardDetails.sourceUrl }, // 透過網址判斷是否已存在
                update: {
                    name: cardDetails.name,
                    category: 'TRAINER',
                    stage: cardDetails.stage,
                    type: cardDetails.type,
                    hp: cardDetails.hp,
                    regulationMark: cardDetails.regulationMark,
                    imageUrl: cardDetails.imageUrl,
                },
                create: {
                    name: cardDetails.name,
                    category: 'TRAINER',
                    stage: cardDetails.stage,
                    type: cardDetails.type,
                    hp: cardDetails.hp,
                    regulationMark: cardDetails.regulationMark,
                    imageUrl: cardDetails.imageUrl,
                    sourceUrl: cardDetails.sourceUrl,
                }
            });

            // 移除原本的 fs.writeFileSync 自動備份邏輯
            await delay(1000 + Math.random() * 2000);

        } catch (error) {
            console.error(`❌ 抓取失敗 ${url}:`, error.message);
            fs.appendFileSync('failed_trainer_urls.txt', url + '\n');
        }
    }

    console.log('\n🎉 訓練家卡詳細資料抓取完畢，已成功寫入資料庫！');
    await browser.close();
    await prisma.$disconnect(); // ✨ 新增：關閉資料庫連線
}

scrapeTrainerCards();