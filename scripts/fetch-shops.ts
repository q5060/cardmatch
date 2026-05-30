/**
 * 從 Google Places API 抓取台灣卡牌/桌遊店資料
 *
 * 使用方式：
 *   npx tsx scripts/fetch-shops.ts
 *
 * 需要在 .env 設定：
 *   GOOGLE_PLACES_API_KEY="..."
 *
 * 輸出：
 *   scripts/shops-raw.json  → 所有原始資料（供人工審查）
 *   scripts/shops-seed.ts   → 可貼入 prisma/seed.ts 的店家陣列草稿
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as dotenv from "dotenv";

dotenv.config();

// ── 設定 ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("❌ 請在 .env 設定 GOOGLE_PLACES_API_KEY");
  process.exit(1);
}

// 台灣所有縣市
const CITIES = [
  "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
  "基隆市", "新竹市", "嘉義市",
  "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣",
  "屏東縣", "宜蘭縣", "花蓮縣", "台東縣",
  "澎湖縣", "金門縣", "連江縣",
];

// 每個縣市跑同一組關鍵字
const QUERY_TEMPLATES = [
  "PTCG {city}",
  "寶可夢卡牌 {city}",
  "pokemon card {city}",
  "神奇寶貝卡牌 {city}",
  "TCG卡店 {city}",
  "卡牌遊戲店 {city}",
  "卡店 {city}",
  "集換式卡牌 {city}",
];

const SEARCHES = CITIES.flatMap((city) =>
  QUERY_TEMPLATES.map((t) => ({
    query: t.replace("{city}", city),
    city: city.replace(/[市縣]/g, ""),
  })),
);

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

interface TextSearchResponse {
  status: string;
  results: PlaceResult[];
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
}

interface DetailsResponse {
  status: string;
  result: PlaceDetails;
}

interface PlaceDetails extends PlaceResult {
  opening_hours?: {
    weekday_text?: string[];
    periods?: Array<{
      open:  { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  international_phone_number?: string;
  website?: string;
  reviews?: Array<{ text: string }>;
}

// ── 輸出記錄型別 ─────────────────────────────────────────────────────────────

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
  reviewTexts: string[];
  foundInCities: string[];
}

// ── 轉換 Google periods → seed hoursJson ─────────────────────────────────────

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function periodsToHoursJson(
  periods: NonNullable<PlaceDetails["opening_hours"]>["periods"] | undefined,
): string {
  const hours: Record<string, [string, string] | null> = {
    mon: null, tue: null, wed: null, thu: null,
    fri: null, sat: null, sun: null,
  };
  if (!periods?.length) return JSON.stringify(hours);

  for (const p of periods) {
    const key = DAY_KEYS[p.open.day];
    if (!key || !p.close) continue;
    const fmt = (t: string) => t.replace(/^(\d{2})(\d{2})$/, "$1:$2");
    hours[key] = [fmt(p.open.time), fmt(p.close.time)];
  }
  return JSON.stringify(hours);
}

// ── API 呼叫 ─────────────────────────────────────────────────────────────────

async function textSearch(query: string): Promise<PlaceResult[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(query)}&region=tw&language=zh-TW&key=${API_KEY}`;
  const res = await get<TextSearchResponse>(url);
  if (res.status !== "OK" && res.status !== "ZERO_RESULTS") {
    console.warn(`  ⚠ status=${res.status} (${query})`);
  }
  return res.results ?? [];
}

async function getDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = [
    "place_id", "name", "geometry", "formatted_address",
    "opening_hours", "rating", "user_ratings_total",
    "types", "international_phone_number", "website", "reviews",
  ].join(",");
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=${fields}&language=zh-TW&key=${API_KEY}`;
  const res = await get<DetailsResponse>(url);
  if (res.status !== "OK") return null;
  return res.result ?? null;
}

// ── 主程式 ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔍 共 ${SEARCHES.length} 組搜尋（${CITIES.length} 縣市 × ${QUERY_TEMPLATES.length} 關鍵字）`);
  console.log(`💰 預估費用：搜尋 $${(SEARCHES.length * 0.032).toFixed(2)} + 詳細資料（依不重複店家數）\n`);

  const seen = new Map<string, ShopRecord>();

  for (const { query, city } of SEARCHES) {
    process.stdout.write(`  ${query} ... `);
    const results = await textSearch(query);
    console.log(`${results.length} 筆`);

    for (const r of results) {
      if (seen.has(r.place_id)) {
        seen.get(r.place_id)!.foundInCities.push(city);
        continue;
      }

      await sleep(150); // 避免太快打 API
      const detail = await getDetails(r.place_id);
      if (!detail) continue;

      seen.set(r.place_id, {
        placeId: detail.place_id,
        name: detail.name,
        lat: detail.geometry.location.lat,
        lng: detail.geometry.location.lng,
        address: detail.formatted_address ?? "",
        rating: detail.rating ?? null,
        ratingCount: detail.user_ratings_total ?? null,
        phone: detail.international_phone_number ?? null,
        website: detail.website ?? null,
        googleTypes: detail.types ?? [],
        weekdayText: detail.opening_hours?.weekday_text ?? [],
        hoursJson: periodsToHoursJson(detail.opening_hours?.periods),
        reviewTexts: (detail.reviews ?? []).map((rv) => rv.text),
        foundInCities: [city],
      });
    }

    await sleep(300);
  }

  // 依評論數排序（越多越可信）
  const shops = Array.from(seen.values())
    .sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));

  console.log(`\n✅ 共找到 ${shops.length} 家不重複店家`);

  // ── 輸出 shops-raw.json ──
  const outDir = __dirname;
  const rawPath = path.join(outDir, "shops-raw.json");
  fs.writeFileSync(rawPath, JSON.stringify(shops, null, 2), "utf-8");
  console.log(`📄 原始資料 → ${rawPath}`);

  // ── 終端機摘要 ──
  console.log("\n── 前 30 筆（依評論數排序）────────────────────────────────");
  console.log("評分   評論數  名稱");
  for (const s of shops.slice(0, 30)) {
    const star  = `★${(s.rating ?? 0).toFixed(1)}`;
    const count = String(s.ratingCount ?? 0).padStart(6);
    const addr  = s.address.split(",")[0];
    console.log(`${star}  ${count}  ${s.name}  (${addr})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
