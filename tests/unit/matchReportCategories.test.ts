import { describe, expect, it } from "vitest";
import {
  MATCH_REPORT_CATEGORIES,
  MATCH_REPORT_CATEGORY_LABELS,
  normalizeMatchReportCategories,
} from "@/lib/matchReportCategories";

describe("matchReportCategories", () => {
  it("defines labels for every category", () => {
    for (const key of Object.values(MATCH_REPORT_CATEGORIES)) {
      expect(MATCH_REPORT_CATEGORY_LABELS[key]).toBeTruthy();
    }
  });

  it("includes unreasonable cancel and excludes removed wrong-result", () => {
    expect(MATCH_REPORT_CATEGORY_LABELS.UNREASONABLE_CANCEL).toBe(
      "對方無故要求取消對戰",
    );
    expect("WRONG_RESULT" in MATCH_REPORT_CATEGORIES).toBe(false);
  });

  it("normalizes and deduplicates valid categories", () => {
    expect(
      normalizeMatchReportCategories([
        MATCH_REPORT_CATEGORIES.NOT_READY,
        MATCH_REPORT_CATEGORIES.NOT_READY,
        "INVALID",
      ]),
    ).toEqual([MATCH_REPORT_CATEGORIES.NOT_READY]);
  });

  it("returns empty array when no valid categories", () => {
    expect(normalizeMatchReportCategories(["bad", ""])).toEqual([]);
  });
});
