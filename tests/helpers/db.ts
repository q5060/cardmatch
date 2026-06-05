import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/password";

const globalForTestPrisma = globalThis as unknown as {
  testPrisma?: PrismaClient;
};

export const testPrisma =
  globalForTestPrisma.testPrisma ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

globalForTestPrisma.testPrisma = testPrisma;

export async function resetTables() {
  await testPrisma.$transaction([
    testPrisma.friendMessage.deleteMany(),
    testPrisma.message.deleteMany(),
    testPrisma.battleResult.deleteMany(),
    testPrisma.notification.deleteMany(),
    testPrisma.matchQueueEntry.deleteMany(),
    testPrisma.match.deleteMany(),
    testPrisma.meetSpot.deleteMany(),
    testPrisma.friendship.deleteMany(),
    testPrisma.deck.deleteMany(),
    testPrisma.userBlock.deleteMany(),
    testPrisma.userReport.deleteMany(),
    testPrisma.shopEvent.deleteMany(),
    testPrisma.shop.deleteMany(),
    testPrisma.user.deleteMany(),
  ]);
}

const TEST_PROFILE_DEFAULTS = {
  gender: "MALE",
  age: 25,
  avatarUrl: "/default-avatar.svg",
} as const;

/** Set identification fields required for battle actions (invite, accept, publish). */
export async function fillProfileIdentification(
  userId: number,
  overrides?: {
    gender?: string;
    age?: number;
    avatarUrl?: string | null;
  },
) {
  return testPrisma.user.update({
    where: { id: userId },
    data: {
      gender: overrides?.gender ?? TEST_PROFILE_DEFAULTS.gender,
      age: overrides?.age ?? TEST_PROFILE_DEFAULTS.age,
      avatarUrl:
        overrides?.avatarUrl === undefined
          ? TEST_PROFILE_DEFAULTS.avatarUrl
          : overrides.avatarUrl,
    },
  });
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName: string;
  gender?: string;
  age?: number;
  avatarUrl?: string | null;
}) {
  return testPrisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      gender: input.gender ?? TEST_PROFILE_DEFAULTS.gender,
      age: input.age ?? TEST_PROFILE_DEFAULTS.age,
      avatarUrl:
        input.avatarUrl === undefined
          ? TEST_PROFILE_DEFAULTS.avatarUrl
          : input.avatarUrl,
    },
  });
}

export async function createLookingMeetSpot(
  userId: number,
  overrides?: {
    lat?: number;
    lng?: number;
    label?: string;
    playNote?: string;
    playFormat?: string;
    shopId?: string | null;
  },
) {
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return testPrisma.meetSpot.create({
    data: {
      userId,
      lat: overrides?.lat ?? 25.033,
      lng: overrides?.lng ?? 121.565,
      label: overrides?.label ?? "測試約戰地點",
      playNote: overrides?.playNote ?? "週末練習",
      playFormat: overrides?.playFormat ?? "ANY",
      active: true,
      looking: true,
      shopId: overrides?.shopId ?? null,
      expiresAt,
    },
  });
}

export async function createShop() {
  return testPrisma.shop.create({
    data: {
      name: "測試卡店",
      lat: 25.033,
      lng: 121.565,
      addressNote: "測試地址",
      hoursJson: "{}",
    },
  });
}
