import { PrismaClient } from "@prisma/client";
import { defaultShopHoursJson } from "../src/lib/shopHours";

const prisma = new PrismaClient();

const weekdayHours = {
  mon: ["10:00", "22:00"],
  tue: ["10:00", "22:00"],
  wed: ["10:00", "22:00"],
  thu: ["10:00", "22:00"],
  fri: ["10:00", "23:00"],
  sat: ["10:00", "23:00"],
  sun: ["11:00", "20:00"],
} as const;

const ximenHours = {
  ...weekdayHours,
  wed: null,
};

const kaohsiungHours = {
  mon: ["12:00", "21:00"],
  tue: ["12:00", "21:00"],
  wed: ["12:00", "21:00"],
  thu: ["12:00", "21:00"],
  fri: ["12:00", "22:00"],
  sat: ["10:00", "22:00"],
  sun: ["10:00", "20:00"],
} as const;

function hoursJson(hours: Record<string, readonly [string, string] | null>): string {
  return JSON.stringify(hours);
}

function daysFromNow(days: number, hour = 14, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysAgo(days: number, hour = 14, minute = 0): Date {
  return daysFromNow(-days, hour, minute);
}

async function main() {
  await prisma.shopEvent.deleteMany();
  await prisma.shop.deleteMany();

  const shops = await prisma.$transaction([
    prisma.shop.create({
      data: {
        name: "台北市卡牌集散地（示意）",
        lat: 25.048,
        lng: 121.517,
        addressNote: "台北車站附近",
        hasPtcgBattleArea: true,
        hoursJson: hoursJson(weekdayHours),
      },
    }),
    prisma.shop.create({
      data: {
        name: "西門桌遊店（示意）",
        lat: 25.042,
        lng: 121.508,
        addressNote: "西門町商圈",
        hasPtcgBattleArea: false,
        hoursJson: hoursJson(ximenHours),
      },
    }),
    prisma.shop.create({
      data: {
        name: "板橋遊戲王道館（示意）",
        lat: 25.014,
        lng: 121.462,
        addressNote: "板橋車站周邊",
        hasPtcgBattleArea: true,
        hoursJson: hoursJson(weekdayHours),
      },
    }),
    prisma.shop.create({
      data: {
        name: "台中對戰空間（示意）",
        lat: 24.1477,
        lng: 120.6736,
        addressNote: "台中火車站附近",
        hasPtcgBattleArea: true,
        hoursJson: defaultShopHoursJson(),
      },
    }),
    prisma.shop.create({
      data: {
        name: "高雄卡牌聚落（示意）",
        lat: 22.6273,
        lng: 120.3014,
        addressNote: "高雄捷運站周邊",
        hasPtcgBattleArea: true,
        hoursJson: hoursJson(kaohsiungHours),
      },
    }),
  ]);

  const [taipei, ximen, banqiao, taichung, kaohsiung] = shops;

  await prisma.shopEvent.createMany({
    data: [
      {
        shopId: taipei.id,
        title: "週末 PTCG 店賽",
        description: "報名費 100 元，優勝者可獲得補充包獎品",
        startsAt: daysFromNow(7, 13, 0),
        endsAt: daysFromNow(7, 17, 0),
      },
      {
        shopId: taipei.id,
        title: "新手教學局",
        description: "歡迎剛入坑的玩家，現場有教學員",
        startsAt: daysAgo(5, 15, 0),
        endsAt: daysAgo(5, 18, 0),
      },
      {
        shopId: ximen.id,
        title: "桌遊同好聚會",
        description: "以桌遊為主，PTCG 對戰區暫不開放",
        startsAt: daysFromNow(3, 19, 0),
      },
      {
        shopId: banqiao.id,
        title: "平日練牌夜",
        description: "平日晚上開放自由對戰",
        startsAt: daysFromNow(2, 19, 30),
        endsAt: daysFromNow(2, 22, 0),
      },
      {
        shopId: taichung.id,
        title: "店內聯盟賽",
        description: "BO3 瑞士輪，限 16 人",
        startsAt: daysFromNow(10, 14, 0),
        endsAt: daysFromNow(10, 18, 0),
      },
      {
        shopId: kaohsiung.id,
        title: "上週店賽回顧夜",
        description: "討論 meta 與自由對戰",
        startsAt: daysAgo(3, 18, 0),
        endsAt: daysAgo(3, 21, 0),
      },
      {
        shopId: kaohsiung.id,
        title: "下週六新手體驗",
        description: "提供預組牌組試玩",
        startsAt: daysFromNow(6, 14, 0),
        endsAt: daysFromNow(6, 17, 0),
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
