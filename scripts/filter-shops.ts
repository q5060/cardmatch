/**
 * 從 shops-raw.json 過濾出有 PTCG 對戰區的店家，寫入 prisma/seed.ts
 *
 * 使用方式：
 *   npx tsx scripts/filter-shops.ts
 *
 * 輸入：scripts/shops-raw.json（由 fetch-shops.ts 產生）
 * 輸出：prisma/seed.ts（直接覆寫）
 */

import * as fs from "fs";
import * as path from "path";

// ── 過濾條件 ─────────────────────────────────────────────────────────────────

// Google types 含這些 → 明顯不是卡牌店
const EXCLUDE_TYPES = [
  "lodging", "meal_delivery", "meal_takeaway",
  "amusement_park", "tourist_attraction", "stadium",
  "hospital", "school", "church", "supermarket",
  "department_store", "shopping_mall", "car_dealer",
  "electronics_store", "home_goods_store",
];

// 名字或評論含這些 → 這裡可以打牌
const CARD_HINTS = [
  // TCG 相關
  "tcg", "ptcg", "card", "cards",
  // 中文卡牌
  "卡牌", "卡片", "集換式",
  // 寶可夢系列
  "pokemon", "寶可夢", "神奇寶貝",
  // 「桌遊」刻意不加：太廣，純桌遊咖啡廳會漏進來
  // 有打牌的桌遊店會在 reviewTexts 裡出現 pokemon/tcg/卡牌 等關鍵字
];

// 一定排除（名稱含關鍵字）
const HARD_EXCLUDE_NAME = [
  // 非商業場所 / 文具 / 便利設施
  "文具", "親子樂園", "資訊廣場", "停車", "加油",
  "醫院", "幼兒園", "便利商店", "百貨", "購物中心",
  "超市", "愛買", "大潤發", "家樂福", "免稅店",
  // 電玩/主機店（主業是賣主機 / 維修）
  "電玩", "電子遊戲", "電動", "任天堂", "夯品集",
  "遊樂器",       // 東晶電視遊樂器、超威電視遊樂器社
  "tv game",      // 德周TV GAME
  // 遊樂場 / 娛樂複合體
  "湯姆熊",       // 湯姆熊歡樂世界
  "waytofun",     // 楽玩多WAYTOFUN（盲盒娛樂場）
  // 玩具店
  "玩具", "積木", "toyworld", "funbox",
  // 電腦 / 維修
  "電腦", "手機維修",
  // 販賣機 / 遊樂場
  "販賣機", "彈珠城", "彈珠台",
  // 文創選物（非卡牌）
  "文創選物",
  // 球卡（運動球員卡，非TCG）—— 注意：「球員卡」不加，避免誤傷碰碰鳥卡牌Pokémon球員卡PSA鑑定
  "球卡",
];

// 手動排除（規則抓不乾淨的個案，直接點名）
// 格式：[店名子字串, 排除原因]
const MANUAL_EXCLUDE: [string, string][] = [
  ["壞蛋-城隍廟店",    "GK公仔/一番賞店，神奇寶貝指的是公仔而非卡牌遊戲"],
  ["金玉堂 金門店",    "文具店（評論明確寫「文具店」），card 來自「卡紙」"],
  ["Ace Card 球員卡",  "棒球/運動球員卡專賣，非TCG"],
  ["塔吉的家",         "追星/手帳文創用品，卡片指偶像卡而非TCG"],
  ["明琦卡店",         "NBA/棒球球員卡，非TCG"],
  ["J Games & Sports", "球員卡，非TCG"],
  ["波波殿 羅東店",    "主業一番賞景品，無卡牌遊戲空間"],
];

// ── 讀取原始資料 ──────────────────────────────────────────────────────────────

const rawPath = path.join(__dirname, "shops-raw.json");
if (!fs.existsSync(rawPath)) {
  console.error("❌ 找不到 scripts/shops-raw.json，請先執行 fetch-shops.ts");
  process.exit(1);
}

const raw: ShopRecord[] = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

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

// ── 過濾 ─────────────────────────────────────────────────────────────────────

const filtered = raw.filter((s) => {
  const nameLower = s.name.toLowerCase();
  const reviewsLower = (s.reviewTexts ?? []).join(" ").toLowerCase();
  const searchText = nameLower + " " + reviewsLower;

  // 第一關：名字或評論必須有卡牌信號
  if (!CARD_HINTS.some((k) => searchText.includes(k))) return false;

  // Google 類型硬排除
  if (EXCLUDE_TYPES.some((t) => s.googleTypes.includes(t))) return false;

  // 名稱硬排除
  if (HARD_EXCLUDE_NAME.some((k) => nameLower.includes(k.toLowerCase()))) return false;

  // 手動個案排除
  if (MANUAL_EXCLUDE.some(([n]) => s.name.includes(n))) return false;

  // 排除台灣以外
  if (s.address.includes("香港") || s.address.includes("澳門")) return false;

  return true;
});

console.log(`原始資料：${raw.length} 筆`);
console.log(`過濾後：${filtered.length} 筆\n`);

filtered.forEach((s) =>
  console.log(`  ★${(s.rating ?? 0).toFixed(1)} (${s.ratingCount ?? 0}則)  ${s.name}  ${s.address.split(",")[0]}`),
);

// ── 產生 seed.ts ──────────────────────────────────────────────────────────────

const shopEntries = filtered.map((s) => {
  const addrNote = s.address
    .replace(/, ?臺灣$/, "")
    .replace(/, ?台灣$/, "")
    .replace(/^\d+/, "")
    .trim();

  return (
    `    {\n` +
    `      name: ${JSON.stringify(s.name)},\n` +
    `      lat: ${s.lat},\n` +
    `      lng: ${s.lng},\n` +
    `      addressNote: ${JSON.stringify(addrNote)},\n` +
    `      hoursJson: ${JSON.stringify(s.hoursJson)},\n` +
    `    },`
  );
});

const seedContent = `import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 資料來源：Google Places API（由 scripts/fetch-shops.ts 抓取）
// 共 ${filtered.length} 家店

async function main() {
  await prisma.shopEvent.deleteMany();
  await prisma.shop.deleteMany();

  await prisma.shop.createMany({
    data: [
${shopEntries.join("\n")}
    ],
  });

  console.log(\`Seeded ${filtered.length} shops.\`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
`;

const seedPath = path.join(__dirname, "../prisma/seed.ts");
fs.writeFileSync(seedPath, seedContent, "utf-8");
console.log(`\n✅ 已寫入 prisma/seed.ts（${filtered.length} 家店）`);
console.log(`   跑 npm run db:seed 讓資料進資料庫`);
