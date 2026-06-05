import { describe, expect, it } from "vitest";
import {
  buildFacebookShareUrl,
  buildSharePostText,
  buildShareUrl,
  buildThreadsShareUrl,
  buildTwitterShareUrl,
  getWinnerDisplayName,
  getWinnerLabelForViewer,
  resolveSiteOrigin,
} from "@/lib/matchShare";
import type { MatchSharePayload } from "@/lib/matchShare";

const sampleShare: MatchSharePayload = {
  matchId: 42,
  completedAt: "2026-06-01T12:00:00.000Z",
  meetLabel: "台北卡牌屋",
  winnerId: 10,
  playerA: { id: 10, displayName: "Alice", avatarUrl: null, deck: null },
  playerB: { id: 20, displayName: "Bob", avatarUrl: null, deck: null },
};

describe("matchShare", () => {
  it("buildShareUrl uses origin without trailing slash", () => {
    expect(buildShareUrl(42, "https://cardmatch.example/")).toBe(
      "https://cardmatch.example/battle/result/42",
    );
  });

  it("resolveSiteOrigin prefers explicit origin", () => {
    expect(resolveSiteOrigin("https://test.dev")).toBe("https://test.dev");
  });

  it("getWinnerDisplayName handles win and draw", () => {
    expect(getWinnerDisplayName(sampleShare)).toBe("Alice 獲勝");
    expect(
      getWinnerDisplayName({ ...sampleShare, winnerId: null }),
    ).toBe("平手");
  });

  it("getWinnerLabelForViewer shows winner display name", () => {
    expect(getWinnerLabelForViewer(sampleShare)).toBe("Alice 獲勝");
  });

  it("buildSharePostText includes players and location", () => {
    const text = buildSharePostText(sampleShare);
    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
    expect(text).toContain("台北卡牌屋");
  });

  it("builds social intent URLs with encoded params", () => {
    const url = buildShareUrl(1, "https://cardmatch.test");
    const tweet = buildTwitterShareUrl(url, "hello");
    expect(tweet).toContain("twitter.com/intent/tweet");
    expect(tweet).toContain(encodeURIComponent(url));

    const fb = buildFacebookShareUrl(url, "CardMatch 對戰結果");
    expect(fb).toContain("facebook.com/sharer");
    expect(fb).toContain(encodeURIComponent(url));
    expect(fb).toContain("quote=");

    const threads = buildThreadsShareUrl(url, "hello");
    expect(threads).toContain("threads.net/intent/post");
    expect(threads).toContain(encodeURIComponent("hello"));
    expect(threads).toContain(encodeURIComponent(url));
  });
});
