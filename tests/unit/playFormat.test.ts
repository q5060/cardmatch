import { describe, expect, it } from "vitest";
import { PLAY_FORMAT } from "@/lib/constants";
import {
  parsePlayFormat,
  playFormatsCompatible,
} from "@/lib/playFormat";

describe("playFormatsCompatible", () => {
  it("matches identical specific formats", () => {
    expect(playFormatsCompatible(PLAY_FORMAT.OPEN, PLAY_FORMAT.OPEN)).toBe(true);
    expect(playFormatsCompatible(PLAY_FORMAT.STANDARD, PLAY_FORMAT.STANDARD)).toBe(true);
  });

  it("does not match different specific formats", () => {
    expect(playFormatsCompatible(PLAY_FORMAT.OPEN, PLAY_FORMAT.STANDARD)).toBe(false);
    expect(playFormatsCompatible(PLAY_FORMAT.STANDARD, PLAY_FORMAT.OPEN)).toBe(false);
  });

  it("matches any format with specific formats", () => {
    expect(playFormatsCompatible(PLAY_FORMAT.ANY, PLAY_FORMAT.OPEN)).toBe(true);
    expect(playFormatsCompatible(PLAY_FORMAT.STANDARD, PLAY_FORMAT.ANY)).toBe(true);
    expect(playFormatsCompatible(PLAY_FORMAT.ANY, PLAY_FORMAT.ANY)).toBe(true);
  });
});

describe("parsePlayFormat", () => {
  it("returns valid formats unchanged", () => {
    expect(parsePlayFormat(PLAY_FORMAT.OPEN)).toBe(PLAY_FORMAT.OPEN);
  });

  it("falls back to ANY for invalid values", () => {
    expect(parsePlayFormat("invalid")).toBe(PLAY_FORMAT.ANY);
    expect(parsePlayFormat(null)).toBe(PLAY_FORMAT.ANY);
  });
});
