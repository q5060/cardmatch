/** Parsed notification payload (legacy plain string or structured JSON). */
export type NotificationPayload =
  | string
  | {
      kind?: string;
      title?: string;
      body?: string;
      meetLabel?: string;
      inviterName?: string;
    };

export function parseNotificationData(
  data: string | Record<string, unknown> | null | undefined,
): NotificationPayload | null {
  if (data == null) return null;
  if (typeof data === "object") return data as NotificationPayload;
  const trimmed = data.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") return parsed as NotificationPayload;
    return trimmed;
  } catch {
    return trimmed;
  }
}

function payloadBody(payload: NotificationPayload | null): string | undefined {
  if (!payload) return undefined;
  if (typeof payload === "string") return payload;
  return payload.body;
}

function payloadTitle(payload: NotificationPayload | null): string | undefined {
  if (!payload || typeof payload === "string") return undefined;
  return payload.title;
}

/** Title line for notification lists and dropdown. */
export function getNotificationTitle(
  type: string,
  data: string | Record<string, unknown> | null | undefined,
): string {
  const payload = parseNotificationData(data);
  const custom = payloadTitle(payload);
  if (custom) return custom;

  switch (type) {
    case "SPOT_INVITE":
      if (typeof payload === "object" && payload?.inviterName) {
        return `${payload.inviterName} 回應你的約戰公告`;
      }
      return "有人回應你的約戰公告";
    case "RANDOM_MATCH":
      if (typeof payload === "object" && payload?.inviterName) {
        return `${payload.inviterName}（隨機配對）`;
      }
      return "隨機配對找到對手";
    case "MATCH_CREATED":
      return "對戰邀請";
    case "MATCH_COMPLETED":
      return "對戰已成立";
    case "BATTLE_RESULT":
      return "對戰結果待確認";
    case "FRIEND_REQUEST":
      return "收到好友邀請";
    case "MESSAGE":
      return "收到新訊息";
    default:
      return "新通知";
  }
}

/** Subtitle / detail line under the title. */
export function getNotificationBody(
  type: string,
  data: string | Record<string, unknown> | null | undefined,
): string | undefined {
  const payload = parseNotificationData(data);
  const custom = payloadBody(payload);
  if (custom) return custom;

  if (typeof payload === "string") return payload;

  switch (type) {
    case "SPOT_INVITE":
    case "RANDOM_MATCH":
      if (typeof payload === "object" && payload?.meetLabel) {
        return `地點：${payload.meetLabel}`;
      }
      return undefined;
    default:
      return typeof payload === "string" ? payload : undefined;
  }
}
