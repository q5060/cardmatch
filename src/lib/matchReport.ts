import prisma from "@/lib/prisma";
import { MATCH_STATUS } from "@/lib/constants";
import {
  MATCH_REPORT_ACTIVE_STATUSES,
  normalizeMatchReportCategories,
} from "@/lib/matchReportCategories";
import { publishMatchSnapshot, publishNotification } from "@/lib/realtime/publish";

export {
  MATCH_REPORT_CATEGORIES,
  MATCH_REPORT_CATEGORY_LABELS,
  MATCH_REPORT_ACTIVE_STATUSES,
  normalizeMatchReportCategories,
  type MatchReportCategory,
} from "@/lib/matchReportCategories";

export async function executeMatchReport(input: {
  reporterId: number;
  matchId: number;
  categories: string[];
  note?: string;
}): Promise<void> {
  const { reporterId, matchId } = input;
  const categories = normalizeMatchReportCategories(input.categories);
  if (categories.length === 0) {
    throw new Error("請至少選擇一項原因");
  }

  const note = (input.note ?? "").trim().slice(0, 200);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("找不到約戰");
  if (match.playerAId !== reporterId && match.playerBId !== reporterId) {
    throw new Error("找不到約戰");
  }
  if (
    !MATCH_REPORT_ACTIVE_STATUSES.includes(
      match.status as (typeof MATCH_REPORT_ACTIVE_STATUSES)[number],
    )
  ) {
    throw new Error("此約戰已結束，無法檢舉");
  }

  const reportedId =
    match.playerAId === reporterId ? match.playerBId : match.playerAId;
  if (reportedId === reporterId) throw new Error("無法檢舉自己");

  await prisma.$transaction(async (tx) => {
    await tx.userReport.create({
      data: {
        reporterId,
        reportedId,
        matchId,
        categories: categories.join(","),
        reason: note,
      },
    });

    await tx.battleResult.deleteMany({ where: { matchId } });

    await tx.match.update({
      where: { id: matchId },
      data: {
        status: MATCH_STATUS.CANCELLED,
        cancelRequestedBy: null,
        playerAReady: false,
        playerBReady: false,
      },
    });

    await tx.notification.create({
      data: {
        userId: reportedId,
        type: "MATCH_CREATED",
        referenceId: matchId.toString(),
        senderId: reporterId,
        data: JSON.stringify("對方已檢舉並結束約戰"),
        read: false,
      },
    });
  });

  await publishMatchSnapshot(matchId);
  await publishNotification(reportedId);
}
