import { PLAY_FORMAT, type PlayFormat } from "@/lib/constants";

const PLAY_FORMAT_VALUES = new Set<string>(Object.values(PLAY_FORMAT));

export const PLAY_FORMAT_LABELS: Record<PlayFormat, string> = {
  [PLAY_FORMAT.OPEN]: "開放賽制",
  [PLAY_FORMAT.STANDARD]: "標準賽制",
  [PLAY_FORMAT.ANY]: "不限賽制",
};

export const PLAY_FORMAT_OPTIONS: PlayFormat[] = [
  PLAY_FORMAT.OPEN,
  PLAY_FORMAT.STANDARD,
  PLAY_FORMAT.ANY,
];

export function isPlayFormat(value: unknown): value is PlayFormat {
  return typeof value === "string" && PLAY_FORMAT_VALUES.has(value);
}

export function parsePlayFormat(value: unknown, fallback: PlayFormat = PLAY_FORMAT.ANY): PlayFormat {
  return isPlayFormat(value) ? value : fallback;
}

/** Two queue entries match when either prefers any format or both prefer the same one. */
export function playFormatsCompatible(a: PlayFormat, b: PlayFormat): boolean {
  return a === PLAY_FORMAT.ANY || b === PLAY_FORMAT.ANY || a === b;
}
