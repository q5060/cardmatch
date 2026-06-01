import * as cheerio from "cheerio";

export async function fetchOfficialDeck(code: string) {
  const targetUrl = `https://asia.pokemon-card.com/tw/deck-build/recipe/${code}`;
  
  // 1. 先印出目標網址，確認 code 是否有正確傳入
  console.log(`[爬蟲] 準備抓取網址: ${targetUrl}`);

  const response = await fetch(targetUrl, {
    // 2. 加上 Headers 偽裝成正常的 Chrome 瀏覽器
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    }
  });

  if (!response.ok) {
    // 3. 如果失敗，印出真實的 HTTP 狀態碼，方便定位問題 (例如 404 或 403)
    console.error(`[爬蟲失敗] 狀態碼: ${response.status} ${response.statusText}`);
    throw new Error("無法取得官方資料");
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  
  const cards: { imageUrl: string; count: number }[] = [];

  // 根據你提供的 HTML 結構，找出所有 li.card
  $('li.card').each((_, element) => {
    // 官方使用 lazy load，所以真實網址在 data-original 屬性中
    const imageUrl = $(element).find('img').attr('data-original') || $(element).find('img').attr('src');
    const countText = $(element).find('.count').text();
    const count = parseInt(countText, 10);

    if (imageUrl && !isNaN(count)) {
      cards.push({ imageUrl, count });
    }
  });

  // 印出抓到了幾張卡片，確認選擇器是否正常運作
  console.log(`[爬蟲] 成功抓取 ${cards.length} 種卡片`);

  return {
    title: "從官方匯入的牌組", // 預設標題，建立時會被 formData 的 title 覆蓋
    cards,
  };
}