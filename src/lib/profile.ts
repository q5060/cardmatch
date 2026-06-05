import { USER_GENDER, type UserGender } from "@/lib/constants";

const GENDER_VALUES = new Set<string>(Object.values(USER_GENDER));

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  [USER_GENDER.MALE]: "男",
  [USER_GENDER.FEMALE]: "女",
  [USER_GENDER.OTHER]: "其他",
};

export type ProfileIdentificationFields = {
  gender: string | null;
  age: number | null;
  avatarUrl: string | null;
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

/** Valid when provided: positive integer age in years. */
export function isUserAge(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export function parseUserAge(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || String(n) !== trimmed) return null;
  return isUserAge(n) ? n : null;
}

export function genderLabel(value: string | null | undefined): string | null {
  return isUserGender(value) ? USER_GENDER_LABELS[value] : null;
}

export function ageLabel(age: number | null | undefined): string | null {
  return isUserAge(age) ? `${age} 歲` : null;
}

/** Inline meta e.g. 「男 · 25 歲」— omit when empty. */
export function profileMetaLine(
  gender: string | null | undefined,
  age: number | null | undefined,
): string | null {
  const parts = [genderLabel(gender), ageLabel(age)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** True when all optional identification fields are filled (informational only). */
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
  if (!user.avatarUrl?.trim()) missing.push("大頭貼");
  return missing;
}

export function parseProfileIdentificationFromFormData(formData: FormData): {
  gender: string;
  age: number | null;
} {
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();

  let gender = "";
  if (genderRaw) {
    if (!isUserGender(genderRaw)) {
      throw new Error("請選擇有效的性別");
    }
    gender = genderRaw;
  }

  let age: number | null = null;
  if (ageRaw) {
    const parsed = parseUserAge(ageRaw);
    if (parsed === null) {
      throw new Error("請填寫有效的年齡（正整數）");
    }
    age = parsed;
  }

  return { gender, age };
}
