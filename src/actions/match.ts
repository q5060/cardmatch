"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MATCH_STATUS, BATTLE_OUTCOME, QUEUE_MODE } from "@/lib/constants";
import { tryRandomPair } from "@/lib/matchmaking";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

function isParticipant(m: { playerAId: string; playerBId: string }, userId: string) {
  return m.playerAId === userId || m.playerBId === userId;
}

export async function joinRandomQueue(lat: number, lng: number, radiusKm: number) {
  const userId = await requireUserId();

  await prisma.matchQueueEntry.deleteMany({ where: { userId } });
  await prisma.matchQueueEntry.create({
    data: {
      userId,
      mode: QUEUE_MODE.RANDOM,
      lat,
      lng,
      radiusKm,
    },
  });

  const matchId = await tryRandomPair(userId);
  revalidatePath("/battle");
  return matchId;
}

export async function leaveQueue() {
  const userId = await requireUserId();
  await prisma.matchQueueEntry.deleteMany({ where: { userId } });
  revalidatePath("/battle");
}

export async function sendLobbyInvite(targetUserId: string) {
  const userId = await requireUserId();
  if (targetUserId === userId) throw new Error("無法邀請自己");

  const mySpot = await prisma.meetSpot.findFirst({
    where: { userId, looking: true, active: true },
  });
  const theirSpot = await prisma.meetSpot.findFirst({
    where: { userId: targetUserId, looking: true, active: true },
  });
  if (!mySpot || !theirSpot) throw new Error("雙方都需公開約戰地點到大廳");

  const playerAId = userId < targetUserId ? userId : targetUserId;
  const playerBId = userId < targetUserId ? targetUserId : userId;

  const existing = await prisma.match.findFirst({
    where: {
      playerAId,
      playerBId,
      status: {
        in: [
          MATCH_STATUS.INVITE_PENDING,
          MATCH_STATUS.ACCEPTED,
          MATCH_STATUS.IN_PROGRESS,
        ],
      },
    },
  });
  if (existing) throw new Error("已有進行中或等待回應的約戰");

  await prisma.match.create({
    data: {
      playerAId,
      playerBId,
      invitedById: userId,
      status: MATCH_STATUS.INVITE_PENDING,
      meetLat: theirSpot.lat,
      meetLng: theirSpot.lng,
      meetLabel: theirSpot.label,
    },
  });

  revalidatePath("/battle");
}

export async function acceptInvite(matchId: string) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.INVITE_PENDING) throw new Error("邀請狀態已變更");
  if (match.invitedById === userId) throw new Error("不能接受自己發出的邀請");

  await prisma.match.update({
    where: { id: matchId },
    data: { status: MATCH_STATUS.ACCEPTED, playerAReady: false, playerBReady: false },
  });

  revalidatePath("/battle");
}

export async function rejectInvite(matchId: string) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.INVITE_PENDING) throw new Error("邀請狀態已變更");

  await prisma.match.update({
    where: { id: matchId },
    data: { status: MATCH_STATUS.CANCELLED },
  });

  revalidatePath("/battle");
}

export async function setReady(matchId: string, ready: boolean) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.ACCEPTED) throw new Error("目前無法切換準備狀態");

  const isA = match.playerAId === userId;
  const data = isA ? { playerAReady: ready } : { playerBReady: ready };

  await prisma.match.update({
    where: { id: matchId },
    data,
  });

  const updated = await prisma.match.findUnique({ where: { id: matchId } });
  if (
    updated?.status === MATCH_STATUS.ACCEPTED &&
    updated.playerAReady &&
    updated.playerBReady
  ) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: MATCH_STATUS.IN_PROGRESS },
    });
  }

  revalidatePath("/battle");
}

export async function cancelMatch(matchId: string) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (
    match.status !== MATCH_STATUS.ACCEPTED &&
    match.status !== MATCH_STATUS.IN_PROGRESS &&
    match.status !== MATCH_STATUS.INVITE_PENDING
  ) {
    throw new Error("無法取消此約戰");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: MATCH_STATUS.CANCELLED },
  });

  revalidatePath("/battle");
}

export async function submitBattleResult(matchId: string, outcome: string) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw new Error("對戰尚未開始或已結束");
  }

  const o =
    outcome === BATTLE_OUTCOME.LOSS
      ? BATTLE_OUTCOME.LOSS
      : outcome === BATTLE_OUTCOME.DRAW
        ? BATTLE_OUTCOME.DRAW
        : BATTLE_OUTCOME.WIN;

  await prisma.$transaction(async (tx) => {
    await tx.battleResult.upsert({
      where: { matchId },
      create: {
        matchId,
        reporterId: userId,
        outcome: o,
      },
      update: {
        reporterId: userId,
        outcome: o,
      },
    });
    await tx.match.update({
      where: { id: matchId },
      data: { status: MATCH_STATUS.COMPLETED },
    });
  });

  revalidatePath("/battle");
  revalidatePath("/profile");
}

export async function finishMatch(
  matchId: string,
  outcome: string,
  addFriend: boolean,
) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw new Error("請待雙方都準備完成、對戰開始後再紀錄結果");
  }

  const o =
    outcome === BATTLE_OUTCOME.LOSS
      ? BATTLE_OUTCOME.LOSS
      : outcome === BATTLE_OUTCOME.DRAW
        ? BATTLE_OUTCOME.DRAW
        : BATTLE_OUTCOME.WIN;

  const otherId =
    match.playerAId === userId ? match.playerBId : match.playerAId;

  await prisma.$transaction(async (tx) => {
    await tx.battleResult.upsert({
      where: { matchId },
      create: {
        matchId,
        reporterId: userId,
        outcome: o,
      },
      update: {
        reporterId: userId,
        outcome: o,
      },
    });
    await tx.match.update({
      where: { id: matchId },
      data: { status: MATCH_STATUS.COMPLETED },
    });
    if (addFriend) {
      const existing = await tx.friendship.findFirst({
        where: {
          OR: [
            { requesterId: userId, addresseeId: otherId },
            { requesterId: otherId, addresseeId: userId },
          ],
        },
      });
      if (!existing) {
        await tx.friendship.create({
          data: {
            requesterId: userId,
            addresseeId: otherId,
            status: "PENDING",
          },
        });
      }
    }
  });

  revalidatePath("/battle");
  revalidatePath("/profile");
  revalidatePath("/friends");
}

export async function requestFriendAfterMatch(matchId: string) {
  const userId = await requireUserId();
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.COMPLETED) throw new Error("約戰尚未完成");

  const otherId =
    match.playerAId === userId ? match.playerBId : match.playerAId;

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: userId },
      ],
    },
  });
  if (!existing) {
    await prisma.friendship.create({
      data: {
        requesterId: userId,
        addresseeId: otherId,
        status: "PENDING",
      },
    });
  }

  revalidatePath("/friends");
  revalidatePath("/battle");
}
