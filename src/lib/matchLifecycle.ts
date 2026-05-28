import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { MATCH_STATUS } from "@/lib/constants";

type Db = Prisma.TransactionClient | typeof prisma;

function isParticipant(
  m: { playerAId: number; playerBId: number },
  userId: number,
) {
  return m.playerAId === userId || m.playerBId === userId;
}

export async function acceptInviteForUser(
  matchId: number,
  userId: number,
  db: Db = prisma,
) {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.INVITE_PENDING) {
    throw new Error("邀請狀態已變更");
  }
  if (match.invitedById === userId) throw new Error("不能接受自己發出的邀請");

  await db.match.update({
    where: { id: matchId },
    data: {
      status: MATCH_STATUS.ACCEPTED,
      playerAReady: false,
      playerBReady: false,
    },
  });

  return match;
}

export async function setReadyForUser(
  matchId: number,
  userId: number,
  ready: boolean,
  db: Db = prisma,
): Promise<{ started: boolean }> {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.ACCEPTED) {
    throw new Error("目前無法切換準備狀態");
  }

  const isA = match.playerAId === userId;
  const data = isA ? { playerAReady: ready } : { playerBReady: ready };

  await db.match.update({
    where: { id: matchId },
    data,
  });

  const updated = await db.match.findUnique({ where: { id: matchId } });
  if (
    updated?.status === MATCH_STATUS.ACCEPTED &&
    updated.playerAReady &&
    updated.playerBReady
  ) {
    await db.match.update({
      where: { id: matchId },
      data: { status: MATCH_STATUS.IN_PROGRESS },
    });
    return { started: true };
  }

  return { started: false };
}
