/**
 * Import cards from pre-collected URL JSON files (phase 2 only).
 * Usage: node Card_info_scrapper/fetch_from_urls.js [energy|trainer|pokemon|all]
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DIR = __dirname;

const TYPES = {
  energy: {
    urlsFile: "energy_urls.json",
    failedFile: "failed_energy_urls.txt",
    category: "ENERGY",
  },
  trainer: {
    urlsFile: "trainer_urls.json",
    failedFile: "failed_trainer_urls.txt",
    category: "TRAINER",
  },
  pokemon: {
    urlsFile: "card_urls.json",
    failedFile: "failed_urls.txt",
    category: "POKEMON",
  },
};

async function extractDetails(page, category) {
  if (category === "POKEMON") {
    return page.evaluate(() => {
      const headerElement = document.querySelector(".pageHeader.cardDetail");
      let name = "";
      let stage = "";
      if (headerElement) {
        stage =
          headerElement.querySelector(".evolveMarker")?.innerText.trim() ||
          "其他";
        const clonedHeader = headerElement.cloneNode(true);
        const marker = clonedHeader.querySelector(".evolveMarker");
        if (marker) marker.remove();
        name = clonedHeader.innerText.trim();
      }
      const elementMap = {
        grass: "草",
        fire: "火",
        water: "水",
        lightning: "雷",
        psychic: "超",
        fighting: "鬥",
        darkness: "惡",
        metal: "鋼",
        dragon: "龍",
        colorless: "無",
      };
      const elementImg = document.querySelector(".mainInfomation img");
      let type = null;
      if (elementImg?.src) {
        const match = elementImg.src.match(/energy\/([^.]+)\.png/i);
        if (match?.[1]) {
          const englishElement = match[1].toLowerCase();
          type = elementMap[englishElement] || englishElement;
        }
      }
      const imageUrl = document.querySelector(".cardImage img")?.src || "";
      const hpElement = document.querySelector(".number");
      const hp = hpElement
        ? parseInt(hpElement.innerText.replace(/\D/g, ""), 10)
        : null;
      const regulationMark =
        document.querySelector(".alpha")?.innerText.trim() || "";
      return {
        name,
        stage,
        type,
        hp,
        subType: null,
        isAceSpec: false,
        regulationMark,
        imageUrl,
        sourceUrl: window.location.href,
      };
    });
  }

  if (category === "TRAINER") {
    return page.evaluate(() => {
      const aceSpecList = [
        "不公印章",
        "覺醒戰鼓",
        "急進開關",
        "危險光線",
        "高級香氛",
        "頂尖捕捉器",
        "貴重手推車",
        "寶可生機劑A",
        "寶可夢旋風回收機",
        "重新啟動箱",
        "璀璨結晶",
        "奢華炸彈",
        "英雄斗篷",
        "極限腰帶",
        "富裕能量",
        "古舊能量",
        "釣竿MAX",
        "珍寶配件",
        "中立中心",
        "奇跡耳麥",
        "希望護身符",
        "能量輸送PRO",
        "百萬噸吹風機",
        "完全體攪拌器",
        "壯偉碩木",
        "倖存鍛鍊器",
        "新沖天能量",
        "大師球",
      ];
      const headerElement = document.querySelector(".pageHeader.cardDetail");
      const name = headerElement?.innerText.trim() || "";
      const subType =
        document.querySelector(".commonHeader")?.innerText.trim() || "訓練家卡";
      const isAceSpec = aceSpecList.includes(name);
      const imageUrl =
        document.querySelector(".cardImage img")?.src ||
        document.querySelector(".cardImage")?.src ||
        "";
      const regulationMark =
        document.querySelector(".alpha")?.innerText.trim() || "";
      return {
        name,
        stage: null,
        type: null,
        hp: null,
        subType,
        isAceSpec,
        regulationMark,
        imageUrl,
        sourceUrl: window.location.href,
      };
    });
  }

  // ENERGY
  return page.evaluate(() => {
    const aceSpecList = [
      "不公印章",
      "覺醒戰鼓",
      "急進開關",
      "危險光線",
      "高級香氛",
      "頂尖捕捉器",
      "貴重手推車",
      "寶可生機劑A",
      "寶可夢旋風回收機",
      "重新啟動箱",
      "璀璨結晶",
      "奢華炸彈",
      "英雄斗篷",
      "極限腰帶",
      "富裕能量",
      "古舊能量",
      "釣竿MAX",
      "珍寶配件",
      "中立中心",
      "奇跡耳麥",
      "希望護身符",
      "能量輸送PRO",
      "百萬噸吹風機",
      "完全體攪拌器",
      "壯偉碩木",
      "倖存鍛鍊器",
      "新沖天能量",
      "大師球",
    ];
    const headerElement = document.querySelector(".pageHeader.cardDetail");
    const name = headerElement?.innerText.trim() || "";
    const subType = name.includes("基本") ? "Basic" : "Special";
    const isAceSpec = aceSpecList.includes(name);
    const imageUrl =
      document.querySelector(".cardImage img")?.src ||
      document.querySelector(".cardImage")?.src ||
      "";
    const regulationMark =
      document.querySelector(".alpha")?.innerText.trim() || "";
    return {
      name,
      stage: null,
      type: null,
      hp: null,
      subType,
      isAceSpec,
      regulationMark,
      imageUrl,
      sourceUrl: window.location.href,
    };
  });
}

async function scrapeType(typeKey, page) {
  const config = TYPES[typeKey];
  const urlsPath = path.join(DIR, config.urlsFile);
  const urls = JSON.parse(fs.readFileSync(urlsPath, "utf8"));
  const failedPath = path.join(process.cwd(), config.failedFile);

  const existing = new Set(
    (
      await prisma.card.findMany({
        where: { category: config.category },
        select: { sourceUrl: true },
      })
    ).map((c) => c.sourceUrl),
  );

  const pending = urls.filter((url) => !existing.has(url));
  console.log(
    `\n=== ${typeKey}: ${urls.length} URLs (${existing.size} already in DB, ${pending.length} to fetch) ===`,
  );

  let ok = 0;
  let skip = existing.size;
  let fail = 0;

  for (let i = 0; i < pending.length; i++) {
    const url = pending[i];
    console.log(`[${typeKey}] [${i + 1}/${pending.length}] ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".cardDetailPage", { timeout: 10000 });
      const cardDetails = await extractDetails(page, config.category);

      await prisma.card.upsert({
        where: { sourceUrl: cardDetails.sourceUrl },
        update: {
          name: cardDetails.name,
          category: config.category,
          stage: cardDetails.stage,
          type: cardDetails.type,
          subType: cardDetails.subType,
          hp: cardDetails.hp,
          isAceSpec: cardDetails.isAceSpec,
          regulationMark: cardDetails.regulationMark,
          imageUrl: cardDetails.imageUrl,
        },
        create: {
          name: cardDetails.name,
          category: config.category,
          stage: cardDetails.stage,
          type: cardDetails.type,
          subType: cardDetails.subType,
          hp: cardDetails.hp,
          isAceSpec: cardDetails.isAceSpec,
          regulationMark: cardDetails.regulationMark,
          imageUrl: cardDetails.imageUrl,
          sourceUrl: cardDetails.sourceUrl,
        },
      });
      ok++;
      await delay(1000 + Math.random() * 2000);
    } catch (error) {
      fail++;
      console.error(`❌ ${url}:`, error.message);
      fs.appendFileSync(failedPath, url + "\n");
    }
  }

  console.log(`=== ${typeKey} done: ${ok} fetched, ${skip} skipped, ${fail} failed ===`);
  return { ok, fail };
}

async function main() {
  const arg = process.argv[2] || "all";
  const order =
    arg === "all" ? ["energy", "trainer", "pokemon"] : [arg];

  for (const key of order) {
    if (!TYPES[key]) {
      console.error(`Unknown type: ${key}. Use energy|trainer|pokemon|all`);
      process.exit(1);
    }
  }

  const startCount = await prisma.card.count();
  console.log(`Card count before: ${startCount}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const key of order) {
      await scrapeType(key, page);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  const endCount = await prisma.card.count();
  console.log(`\nCard count after: ${endCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
