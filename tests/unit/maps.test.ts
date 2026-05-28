import { describe, expect, it } from "vitest";
import {
  formatCoordinates,
  googleMapsNavUrl,
  isValidCoordinates,
} from "@/lib/maps";

describe("isValidCoordinates", () => {
  it("accepts valid lat/lng", () => {
    expect(isValidCoordinates(25.033, 121.565)).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    expect(isValidCoordinates(91, 0)).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(isValidCoordinates(Number.NaN, 0)).toBe(false);
  });
});

describe("formatCoordinates", () => {
  it("formats to 5 decimal places", () => {
    expect(formatCoordinates(25.0333333, 121.5655555)).toBe("25.03333, 121.56556");
  });
});

describe("googleMapsNavUrl", () => {
  it("encodes destination query", () => {
    const url = googleMapsNavUrl(25.033, 121.565);
    expect(url).toContain("google.com/maps/dir");
    expect(url).toContain(encodeURIComponent("25.033,121.565"));
  });
});
