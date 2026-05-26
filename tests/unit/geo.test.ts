import { describe, expect, it } from "vitest";
import { distanceKm, midpoint } from "@/lib/geo";

describe("distanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(distanceKm(25.033, 121.565, 25.033, 121.565)).toBe(0);
  });

  it("computes approximate distance between Taipei and Kaohsiung", () => {
    const km = distanceKm(25.033, 121.565, 22.627, 120.301);
    expect(km).toBeGreaterThan(250);
    expect(km).toBeLessThan(350);
  });
});

describe("midpoint", () => {
  it("averages coordinates", () => {
    expect(midpoint(0, 0, 10, 20)).toEqual({ lat: 5, lng: 10 });
  });
});
