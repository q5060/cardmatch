export const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type DayHours = [string, string] | null;

export type ShopHoursWeek = Record<WeekdayKey, DayHours>;

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "週一",
  tue: "週二",
  wed: "週三",
  thu: "週四",
  fri: "週五",
  sat: "週六",
  sun: "週日",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

function parseDayHours(value: unknown): DayHours {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [open, close] = value;
  if (!isValidTime(open) || !isValidTime(close)) return null;
  if (open >= close) return null;
  return [open, close];
}

export function parseShopHours(json: string | undefined | null): ShopHoursWeek | null {
  if (!json || !json.trim()) return null;
  try {
    const raw: unknown = JSON.parse(json);
    if (!raw || typeof raw !== "object") return null;

    const hours = {} as ShopHoursWeek;
    for (const key of WEEKDAY_KEYS) {
      hours[key] = parseDayHours((raw as Record<string, unknown>)[key] ?? null);
    }
    return hours;
  } catch {
    return null;
  }
}

/** Weekday in Asia/Taipei → mon…sun */
function weekdayKeyFromDate(date: Date): WeekdayKey {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  }).format(date);
  const map: Record<string, WeekdayKey> = {
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
    Sun: "sun",
  };
  return map[weekday] ?? "mon";
}

function taipeiParts(date: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hours, minutes };
}

function minutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isShopOpenNow(hours: ShopHoursWeek | null | undefined, now: Date = new Date()): boolean {
  if (!hours || typeof hours !== "object") return false;
  try {
    const key = weekdayKeyFromDate(now);
    const day = hours[key];
    if (!day) return false;

    const { hours: h, minutes: m } = taipeiParts(now);
    const nowMinutes = minutesSinceMidnight(h, m);
    const openMinutes = parseTimeToMinutes(day[0]);
    const closeMinutes = parseTimeToMinutes(day[1]);

    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  } catch (e) {
    console.error("Error checking shop open status:", e);
    return false;
  }
}

export function formatTodayHours(hours: ShopHoursWeek | null | undefined, now: Date = new Date()): string | null {
  if (!hours || typeof hours !== "object") return null;
  const key = weekdayKeyFromDate(now);
  const day = hours[key];
  if (!day) return null;
  return `${day[0]}–${day[1]}`;
}

export function formatWeeklyHours(
  hours: ShopHoursWeek | null | undefined,
): { day: string; label: string }[] {
  if (!hours || typeof hours !== "object") return [];
  return WEEKDAY_KEYS.map((key) => {
    const day = hours[key];
    return {
      day: WEEKDAY_LABELS[key],
      label: day ? `${day[0]}–${day[1]}` : "休息",
    };
  });
}

/** Default hours for seed / fallback: Mon–Sun 10:00–22:00 */
export function defaultShopHoursJson(): string {
  const hours: ShopHoursWeek = {
    mon: ["10:00", "22:00"],
    tue: ["10:00", "22:00"],
    wed: ["10:00", "22:00"],
    thu: ["10:00", "22:00"],
    fri: ["10:00", "22:00"],
    sat: ["10:00", "22:00"],
    sun: ["11:00", "20:00"],
  };
  return JSON.stringify(hours);
}
