/**
 * 為 shops-raw.json 每家店補抓 Google 評論文字
 *
 * 使用方式：
 *   npx tsx scripts/enrich-reviews.ts
 *
 * 輸入：scripts/shops-raw.json（由 fetch-shops.ts 產生）
 * 輸出：scripts/shops-raw.json（覆寫，加入 reviewTexts 欄位）
 *
 * 費用：shops 數量 × $0.017（Place Details SKU）
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("❌ 請在 .env 設定 GOOGLE_PLACES_API_KEY");
  process.exit(1);
}

// ── HTTP 輔助 ────────────────────────────────────────────────────────────────

function get<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("JSON parse error: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Google API 型別 ──────────────────────────────────────────────────────────

interface DetailsResponse {
  status: string;
  result?: {
    reviews?: Array<{ text: string }>;
  };
}

// ── 資料型別 ─────────────────────────────────────────────────────────────────

interface ShopRecord {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  phone: string | null;
  website: string | null;
  googleTypes: string[];
  weekdayText: string[];
  hoursJson: string;
  reviewTexts?: string[];
  foundInCities: string[];
}

// ── 主程式 ───────────────────────────────────────────────────────────────────

async function main() {
  const rawPath = path.join(__dirname, "shops-raw.json");
  if (!fs.existsSync(rawPath)) {
    console.error("❌ 找不到 scripts/shops-raw.json，請先執行 fetch-shops.ts");
    process.exit(1);
  }

  const shops: ShopRecord[] = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  const alreadyDone = shops.filter((s) => s.reviewTexts !== undefined).length;

  console.log(`共 ${shops.length} 家店，其中 ${alreadyDone} 家已有 reviewTexts`);
  console.log(`需補抓：${shops.length - alreadyDone} 家`);
  console.log(`預估費用：$${((shops.length - alreadyDone) * 0.017).toFixed(2)}\n`);

  let done = 0;
  let failed = 0;

  for (const shop of shops) {
    if (shop.reviewTexts !== undefined) continue; // 已補過，跳過

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${shop.placeId}&fields=reviews&language=zh-TW&key=${API_KEY}`;

    try {
      const res = await get<DetailsResponse>(url);
      if (res.status === "OK") {
        shop.reviewTexts = (res.result?.reviews ?? []).map((r) => r.text);
      } else {
        shop.reviewTexts = [];
        failed++;
      }
    } catch {
      shop.reviewTexts = [];
      failed++;
    }

    done++;
    if (done % 50 === 0) {
      process.stdout.write(`  ${done}/${shops.length - alreadyDone} ...`);
      // 中途存檔，避免意外中斷遺失進度
      fs.writeFileSync(rawPath, JSON.stringify(shops, null, 2), "utf-8");
      console.log(" 已存檔");
    }

    await sleep(150);
  }

  fs.writeFileSync(rawPath, JSON.stringify(shops, null, 2), "utf-8");
  console.log(`\n✅ 完成！補抓 ${done} 家，失敗 ${failed} 家`);
  console.log(`   跑 npx tsx scripts/filter-shops.ts 重新產生 seed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
