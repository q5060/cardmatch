import { describe, expect, it } from "vitest";
import {
  isShopOpenNow,
  parseShopHours,
  type ShopHoursWeek,
} from "@/lib/shopHours";

const openWeek: ShopHoursWeek = {
  mon: ["10:00", "22:00"],
  tue: ["10:00", "22:00"],
  wed: ["10:00", "22:00"],
  thu: ["10:00", "22:00"],
  fri: ["10:00", "22:00"],
  sat: ["10:00", "22:00"],
  sun: ["10:00", "22:00"],
};

describe("parseShopHours", () => {
  it("parses valid JSON", () => {
    const hours = parseShopHours(JSON.stringify(openWeek));
    expect(hours?.mon).toEqual(["10:00", "22:00"]);
  });

  it("returns null for invalid close-before-open", () => {
    const hours = parseShopHours(
      JSON.stringify({ ...openWeek, mon: ["22:00", "10:00"] }),
    );
    expect(hours?.mon).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseShopHours("")).toBeNull();
    expect(parseShopHours(null)).toBeNull();
  });
});

describe("isShopOpenNow", () => {
  it("returns true during business hours (Taipei Monday noon)", () => {
    const mondayNoonTaipei = new Date("2026-05-25T04:00:00.000Z");
    expect(isShopOpenNow(openWeek, mondayNoonTaipei)).toBe(true);
  });

  it("returns false on closed day", () => {
    const closed: ShopHoursWeek = { ...openWeek, wed: null };
    const wednesdayNoonTaipei = new Date("2026-05-27T04:00:00.000Z");
    expect(isShopOpenNow(closed, wednesdayNoonTaipei)).toBe(false);
  });
});
