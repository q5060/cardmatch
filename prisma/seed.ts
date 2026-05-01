import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.shop.deleteMany();
  await prisma.shop.createMany({
    data: [
      {
        name: "台北市卡牌集散地（示意）",
        lat: 25.048,
        lng: 121.517,
        addressNote: "台北車站附近",
      },
      {
        name: "西門桌遊店（示意）",
        lat: 25.042,
        lng: 121.508,
        addressNote: "西門町商圈",
      },
      {
        name: "板橋遊戲王道館（示意）",
        lat: 25.014,
        lng: 121.462,
        addressNote: "板橋車站周邊",
      },
      {
        name: "台中對戰空間（示意）",
        lat: 24.1477,
        lng: 120.6736,
        addressNote: "台中火車站附近",
      },
      {
        name: "高雄卡牌聚落（示意）",
        lat: 22.6273,
        lng: 120.3014,
        addressNote: "高雄捷運站周邊",
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
