import prisma from "@/lib/prisma";
import {
  USER_AGE_MAX,
  USER_AGE_MIN,
  USER_GENDER,
  type UserGender,
} from "@/lib/constants";

const GENDER_VALUES = new Set<string>(Object.values(USER_GENDER));

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  [USER_GENDER.MALE]: "男",
  [USER_GENDER.FEMALE]: "女",
};

export type ProfileIdentificationFields = {
  gender: string | null;
  age: number | null;
  avatarUrl: string | null;
};

const EMPTY_PROFILE_IDENTIFICATION: ProfileIdentificationFields = {
  gender: null,
  age: null,
  avatarUrl: null,
};

export const PLAYER_IDENTIFICATION_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  gender: true,
  age: true,
} as const;

export type PlayerIdentification = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  gender: string;
  age: number | null;
};

export function isUserGender(value: string | null | undefined): value is UserGender {
  return Boolean(value && GENDER_VALUES.has(value));
}

export function isUserAge(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= USER_AGE_MIN &&
    value <= USER_AGE_MAX
  );
}

export function parseUserAge(raw: string): number | null {
  const n = parseInt(raw.trim(), 10);
  return isUserAge(n) ? n : null;
}

export function genderLabel(value: string | null | undefined): string | null {
  return isUserGender(value) ? USER_GENDER_LABELS[value] : null;
}

export function ageLabel(age: number | null | undefined): string | null {
  return isUserAge(age ?? NaN) ? `${age} 歲` : null;
}

export function isProfileIdentificationComplete(
  user: ProfileIdentificationFields,
): boolean {
  return (
    isUserGender(user.gender) &&
    isUserAge(user.age) &&
    Boolean(user.avatarUrl?.trim())
  );
}

export function profileIdentificationMissing(
  user: ProfileIdentificationFields,
): string[] {
  const missing: string[] = [];
  if (!isUserGender(user.gender)) missing.push("性別");
  if (!isUserAge(user.age)) missing.push("年齡");
  if (!user.avatarUrl?.trim()) missing.push("大頭貼照片");
  return missing;
}

export function profileIdentificationErrorMessage(
  user: ProfileIdentificationFields,
): string {
  const missing = profileIdentificationMissing(user);
  if (missing.length === 0) return "";
  return `請先完成個人檔案：${missing.join("、")}`;
}

export async function assertProfileIdentificationComplete(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gender: true,
      age: true,
      avatarUrl: true,
    },
  });
  if (!user || !isProfileIdentificationComplete(user)) {
    throw new Error(
      profileIdentificationErrorMessage(user ?? EMPTY_PROFILE_IDENTIFICATION),
    );
  }
}

export function parseProfileIdentificationFromFormData(formData: FormData): {
  gender: string;
  age: number;
} {
  const gender = String(formData.get("gender") ?? "").trim();
  const age = parseUserAge(String(formData.get("age") ?? ""));

  if (!isUserGender(gender)) {
    throw new Error("請選擇性別（男或女）");
  }
  if (age === null) {
    throw new Error(`請填寫年齡（${USER_AGE_MIN}–${USER_AGE_MAX} 歲）`);
  }

  return { gender, age };
}
