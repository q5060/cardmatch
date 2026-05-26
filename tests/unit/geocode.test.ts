import { describe, expect, it } from "vitest";
import { normalizeNominatimResult } from "@/lib/geocode";

describe("normalizeNominatimResult", () => {
  it("maps lat/lon and builds label from name", () => {
    const place = normalizeNominatimResult({
      lat: "25.0330",
      lon: "121.5654",
      display_name: "台北車站, 中正區, 台北市, 台灣",
      name: "台北車站",
    });
    expect(place.lat).toBeCloseTo(25.033);
    expect(place.lng).toBeCloseTo(121.5654);
    expect(place.label).toBe("台北車站");
    expect(place.subtitle).toContain("中正區");
  });

  it("uses first display_name segment when name is missing", () => {
    const place = normalizeNominatimResult({
      lat: "22.0",
      lon: "120.0",
      display_name: "高雄車站, 高雄, 台灣",
    });
    expect(place.label).toBe("高雄車站");
  });
});
