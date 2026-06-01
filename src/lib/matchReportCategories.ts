import { MATCH_STATUS } from "@/lib/constants";

export const MATCH_REPORT_CATEGORIES = {
  NOT_READY: "NOT_READY",
  UNREASONABLE_CANCEL: "UNREASONABLE_CANCEL",
  REFUSE_RESULT: "REFUSE_RESULT",
  OTHER: "OTHER",
} as const;

export type MatchReportCategory =
  (typeof MATCH_REPORT_CATEGORIES)[keyof typeof MATCH_REPORT_CATEGORIES];

export const MATCH_REPORT_CATEGORY_LABELS: Record<MatchReportCategory, string> = {
  [MATCH_REPORT_CATEGORIES.NOT_READY]: "對方不按準備",
  [MATCH_REPORT_CATEGORIES.UNREASONABLE_CANCEL]: "對方無故要求取消對戰",
  [MATCH_REPORT_CATEGORIES.REFUSE_RESULT]: "對方不接受比賽結果",
  [MATCH_REPORT_CATEGORIES.OTHER]: "其他",
};

export const MATCH_REPORT_ACTIVE_STATUSES = [
  MATCH_STATUS.INVITE_PENDING,
  MATCH_STATUS.ACCEPTED,
  MATCH_STATUS.IN_PROGRESS,
] as const;

const CATEGORY_SET = new Set<string>(Object.values(MATCH_REPORT_CATEGORIES));

export function normalizeMatchReportCategories(
  categories: string[],
): MatchReportCategory[] {
  const seen = new Set<MatchReportCategory>();
  for (const raw of categories) {
    if (CATEGORY_SET.has(raw)) {
      seen.add(raw as MatchReportCategory);
    }
  }
  return [...seen];
}
