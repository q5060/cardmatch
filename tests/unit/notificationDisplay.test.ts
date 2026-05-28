import { describe, expect, it } from "vitest";
import {
  getNotificationBody,
  getNotificationTitle,
  parseNotificationData,
} from "@/lib/notificationDisplay";

describe("parseNotificationData", () => {
  it("parses JSON string payloads", () => {
    const payload = parseNotificationData(
      JSON.stringify({ title: "自訂標題", body: "內文" }),
    );
    expect(payload).toEqual({ title: "自訂標題", body: "內文" });
  });

  it("returns plain string for legacy text", () => {
    expect(parseNotificationData("對戰邀請已接受")).toBe("對戰邀請已接受");
  });
});

describe("getNotificationTitle", () => {
  it("uses custom title from payload", () => {
    expect(
      getNotificationTitle(
        "SPOT_INVITE",
        JSON.stringify({ title: "自訂" }),
      ),
    ).toBe("自訂");
  });

  it("falls back for SPOT_INVITE", () => {
    expect(
      getNotificationTitle(
        "SPOT_INVITE",
        JSON.stringify({ inviterName: "小明" }),
      ),
    ).toBe("小明 回應你的約戰公告");
  });

  it("falls back for unknown type", () => {
    expect(getNotificationTitle("UNKNOWN", null)).toBe("新通知");
  });
});

describe("getNotificationBody", () => {
  it("returns meet label for spot invite", () => {
    expect(
      getNotificationBody(
        "SPOT_INVITE",
        JSON.stringify({ meetLabel: "台北車站" }),
      ),
    ).toBe("地點：台北車站");
  });
});
