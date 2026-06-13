import { describe, expect, it } from "vitest";
import {
  isStaleAnnouncementError,
  STALE_ANNOUNCEMENT_ERROR,
} from "@/lib/meetSpotErrors";

describe("isStaleAnnouncementError", () => {
  it("matches the stale announcement error message", () => {
    expect(isStaleAnnouncementError(new Error(STALE_ANNOUNCEMENT_ERROR))).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isStaleAnnouncementError(new Error("其他錯誤"))).toBe(false);
    expect(isStaleAnnouncementError("此公告已失效或不存在")).toBe(false);
  });
});
