import type { RealtimeEvent } from "./types";

export const REALTIME_CHANNEL_PREFIX = "cardmatch:user:";

export function userChannel(userId: number): string {
  return `${REALTIME_CHANNEL_PREFIX}${userId}`;
}

export function serializeRealtimeEvent(event: RealtimeEvent): string {
  return JSON.stringify(event);
}

export function parseRealtimeEvent(raw: string): RealtimeEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    return parsed as RealtimeEvent;
  } catch {
    return null;
  }
}
