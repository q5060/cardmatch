const puppeteer = require('puppeteer');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 隨機延遲函數：保護爬蟲不被官方伺服器封鎖
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePokemonCards() {
    console.log('啟動瀏覽器...');
    // 開啟實體瀏覽器方便觀察點擊流程，測試成功後可改回 true
    const browser = await puppeteer.launch({ headless: true }); 
    const page = await browser.newPage();

    // =========================================================
    // 第一階段：模擬過濾條件並收集所有卡牌連結
    // =========================================================
    console.log('\n--- 開始第一階段：模擬過濾條件並收集連結 ---');
    
    // 前往搜尋表單頁面
    await page.goto('https://asia.pokemon-card.com/tw/card-search/list/', { waitUntil: 'networkidle2' });

    try {
        console.log('等待搜尋表單載入...');
        
        // =========================================================
        // ✨ 新增步驟：選擇「寶可夢」卡牌類型
        // =========================================================
        const pokemonTypeSelector = 'label[for="Pokemon"]'; 
        
        await page.waitForSelector(pokemonTypeSelector, { timeout: 10000 });
        console.log('選擇卡牌類型：寶可夢...');
        await page.click(pokemonTypeSelector);
        
        // 稍微等待一下，讓網頁底層的 JavaScript 確實把狀態切換過去
        await delay(500);

        // =========================================================
        // 原本的步驟：勾選標準賽與搜尋
        // =========================================================
        
        // ⚠️ 替換點 A：標準賽 Checkbox 的真實 Class
        const standardCheckboxSelector = '.regulation'; 
        await page.waitForSelector(standardCheckboxSelector, { timeout: 10000 });
        console.log('勾選標準賽制...');
        await page.click(standardCheckboxSelector);

        // ⚠️ 替換點 B：搜尋按鈕的真實 Class
        const searchButtonSelector = '.spSearchButton'; 
        console.log('點擊搜尋按鈕並等待頁面跳轉...');
        
        // 將 click 與 waitForNavigation 綁定，避免 Execution context was destroyed
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
            page.click(searchButtonSelector)
        ]);

        console.log('等待卡牌列表渲染...');
        await page.waitForSelector('a[href*="/tw/card-search/detail/"]', { timeout: 15000 });
        await delay(1500); 

        console.log('✅ 成功進入標準賽「寶可夢」卡牌列表！');

    } catch (error) {
        console.error('❌ 模擬點擊失敗，請檢查 Selector 是否正確：', error.message);
        await browser.close();
        return; 
    }

    let cardDetailUrls = [];
    let hasNextPage = true;
    let pageNum = 1;
    let lastPageFirstUrl = ''; // 紀錄上一頁的第一張卡

    while (hasNextPage) {
        console.log(`正在掃描第 ${pageNum} 頁...`);
        
        const urlsOnPage = await page.evaluate(() => {
            const links = document.querySelectorAll('a[href*="/tw/card-search/detail/"]');
            const uniqueLinks = new Set(Array.from(links).map(link => link.href));
            return Array.from(uniqueLinks);
        });

        // 🛡️ 防呆機制：如果這頁完全沒資料，或這頁的第一張卡跟上一頁一模一樣，代表沒翻頁成功
        if (urlsOnPage.length === 0 || urlsOnPage[0] === lastPageFirstUrl) {
            console.log(`\n🛑 發現重複資料或無資料，判定已達最後一頁！`);
            break; // 強制跳出迴圈
        }
        
        lastPageFirstUrl = urlsOnPage[0]; // 更新紀錄
        cardDetailUrls.push(...urlsOnPage);
        console.log(`第 ${pageNum} 頁找到 ${urlsOnPage.length} 張卡牌，目前共收集 ${cardDetailUrls.length} 個連結。`);

        // ⚠️ 替換點 C：請根據你在第 241 頁觀察到的 class，把 .disabled 換成正確的字
        const nextButton = await page.$('li.paginationItem.next:not(.disabled)'); 
        
        if (nextButton) {
            console.log('點擊下一頁...');
            // 將 click 與 waitForNavigation 綁定，避免 Execution context was destroyed 錯誤
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
                nextButton.click()
            ]);
            
            // 給予 SPA 框架渲染新卡牌的緩衝時間
            await page.waitForSelector('a[href*="/tw/card-search/detail/"]', { timeout: 10000 }).catch(() => {});
            await delay(1500); 
            
            pageNum++;
        } else {
            hasNextPage = false;
            console.log(`\n✅ 找不到有效的下一頁按鈕，標準環境總共收集了 ${cardDetailUrls.length} 個連結。`);
        }
    }
    // 備份第一階段的網址結果
    fs.writeFileSync('card_urls.json', JSON.stringify(cardDetailUrls, null, 2), 'utf-8');
    console.log('已將所有詳細頁連結備份至 card_urls.json\n');
    

    // =========================================================
    // 第二階段：逐一進入連結，深度抓取卡牌詳細數值
    // =========================================================
    console.log('--- 開始第二階段：深度抓取卡牌詳細數值 ---');

    for (let i = 0; i < cardDetailUrls.length; i++) {
        const url = cardDetailUrls[i];
        console.log(`[${i + 1}/${cardDetailUrls.length}] 正在分析: ${url}`);
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            // ⚠️ 替換點 D：確認詳細頁中，卡牌名稱的真實 Class
            await page.waitForSelector('.cardDetailPage', { timeout: 10000 });

            const cardDetails = await page.evaluate(() => {
                // 1. 取得標題容器
                const headerElement = document.querySelector('.pageHeader.cardDetail');
                let name = '';
                let stage = '';

                if (headerElement) {
                    // 直接從 .evolveMarker 提取進化階段（基礎、一階、二階等）
                    stage = headerElement.querySelector('.evolveMarker')?.innerText.trim() || '其他';
                    
                    // 使用 cloneNode 技巧提取純名稱，避免抓到 span 裡的文字
                    const clonedHeader = headerElement.cloneNode(true);
                    const marker = clonedHeader.querySelector('.evolveMarker');
                    if (marker) marker.remove();
                    name = clonedHeader.innerText.trim();
                }

                // 2. 抓取其他關鍵數值 (請務必依照官方實際 class 替換)
                // 建立一個完整的屬性翻譯字典 (將英文檔名對應到中文)
                const elementMap = {
                    'grass': '草',
                    'fire': '火',
                    'water': '水',
                    'lightning': '雷',
                    'psychic': '超',
                    'fighting': '鬥',
                    'darkness': '惡',
                    'metal': '鋼',
                    'dragon': '龍',
                    'colorless': '無'
                };

                // ⚠️ 替換點：尋找包住屬性圖片的真實 DOM 節點 (例如 '.pokemon-element img')
                const elementImg = document.querySelector('.mainInfomation img');
                let type = null;

                if (elementImg && elementImg.src) {
                    // 從網址中提取英文屬性名稱
                    // 例如從 ".../energy/Grass.png" 提取出 "Grass"
                    const srcString = elementImg.src;
                    
                    // 使用正規表達式抓取 energy/ 後面、.png 前面的字串
                    const match = srcString.match(/energy\/([^.]+)\.png/i);
                    
                    if (match && match[1]) {
                        // 將抓到的字串轉成小寫 (grass)，再去字典裡面找對應的中文
                        const englishElement = match[1].toLowerCase();
                        // 如果字典裡有就給中文，沒有的話就先保留原始的英文避免資料遺失
                        type = elementMap[englishElement] || englishElement; 
                    }
                } 

                // 加上 img，精準選取圖片標籤
                const imageUrl = document.querySelector('.cardImage img')?.src || '';   
                
                // 取得血量數字
                const hpElement = document.querySelector('.number');
                const hp = hpElement ? parseInt(hpElement.innerText.replace(/\D/g, '')) : null;

                // 3. 抓取賽制標記
                // 建議將這個欄位也獨立出來，方便你之後在資料庫做賽制過濾
                const regulationMark = document.querySelector('.alpha')?.innerText.trim() || '';

                return {
                    name,
                    stage, // 新增：基礎/一階/二階
                    type,
                    hp,
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
                    category: 'POKEMON',
                    stage: cardDetails.stage,
                    type: cardDetails.type,
                    hp: cardDetails.hp,
                    regulationMark: cardDetails.regulationMark,
                    imageUrl: cardDetails.imageUrl,
                },
                create: {
                    name: cardDetails.name,
                    category: 'POKEMON',
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
            // 抓取失敗時記錄網址
            fs.appendFileSync('failed_urls.txt', url + '\n');
        }
    }

    console.log('\n🎉 寶可夢卡詳細資料抓取完畢，已成功寫入資料庫！');
    await browser.close();
    await prisma.$disconnect(); // ✨ 新增：關閉資料庫連線
}

scrapePokemonCards();