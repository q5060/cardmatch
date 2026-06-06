"use server";

import { createInviteMatch } from "@/lib/matchInvite";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MATCH_STATUS } from "@/lib/constants";
import { assertUserOwnsDeck } from "@/lib/matchDeck";
import { assertNotBlocked } from "@/lib/block";
import { STALE_ANNOUNCEMENT_ERROR } from "@/lib/meetSpotErrors";
import {
  acceptInviteForUser,
  setReadyForUser,
} from "@/lib/matchLifecycle";
import {
  getMatchSharePayload,
  type FinishMatchResult,
  type MatchSharePayload,
} from "@/lib/matchShare";
import {
  battleResultNoteUpdateData,
  getBattleResultNoteFields,
  isValidNoteVisibility,
  MATCH_NOTE_MAX_LENGTH,
} from "@/lib/matchNotes";
import {
  publishMatchCompleted,
  publishMatchSnapshot,
  publishNotification,
} from "@/lib/realtime/publish";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

function isParticipant(m: { playerAId: number; playerBId: number }, userId: number) {
  return m.playerAId === userId || m.playerBId === userId;
}

export async function sendInviteFromSpot(
  spotId: string,
  inviterDeckId?: string | null,
) {
  const userId = await requireUserId();

  let deckId = inviterDeckId?.trim() || null;
  if (deckId) {
    await assertUserOwnsDeck(userId, deckId);
  } else {
    deckId = null;
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.meetSpot.updateMany({
      where: {
        id: spotId,
        looking: true,
        active: true,
        expiresAt: { gt: now },
      },
      data: { looking: false },
    });
    if (claimed.count === 0) {
      throw new Error(STALE_ANNOUNCEMENT_ERROR);
    }

    const spot = await tx.meetSpot.findUnique({
      where: { id: spotId },
      include: {
        deck: { select: { id: true } },
      },
    });
    if (!spot) throw new Error(STALE_ANNOUNCEMENT_ERROR);

    const targetUserId = spot.userId;
    if (targetUserId === userId) throw new Error("無法邀請自己");
    await assertNotBlocked(userId, targetUserId);

    await createInviteMatch(
      {
        inviterId: userId,
        targetUserId,
        meet: {
          lat: spot.lat,
          lng: spot.lng,
          label: spot.label,
          shopId: spot.shopId,
        },
        source: "spot",
        spotLabelForNotification: spot.label,
        publisherId: targetUserId,
        publisherDeckId: spot.deckId,
        inviterDeckId: deckId,
      },
      tx,
    );
  });
}

export async function setMatchDeck(matchId: string, deckId: string | null) {
  const userId = await requireUserId();
  const id = parseInt(matchId, 10);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.ACCEPTED) {
    throw new Error("目前無法變更牌組");
  }

  const isA = match.playerAId === userId;
  if (isA && match.playerAReady) throw new Error("已準備，請先取消準備再變更牌組");
  if (!isA && match.playerBReady) throw new Error("已準備，請先取消準備再變更牌組");

  let nextDeckId: string | null = deckId?.trim() || null;
  if (nextDeckId) {
    await assertUserOwnsDeck(userId, nextDeckId);
  } else {
    nextDeckId = null;
  }

  await prisma.match.update({
    where: { id },
    data: isA ? { playerADeckId: nextDeckId } : { playerBDeckId: nextDeckId },
  });

  await publishMatchSnapshot(id);
  revalidatePath("/battle");
}

export async function acceptInvite(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await acceptInviteForUser(id, userId);

  // Send notification to inviter
  const inviterId = match.invitedById;
  await prisma.notification.create({
    data: {
      userId: inviterId,
      type: "MATCH_CREATED",
      referenceId: id.toString(),
      senderId: userId,
      data: JSON.stringify(`對戰邀請已接受`),
      read: false,
    },
  });

  await publishMatchSnapshot(id);
  await publishNotification(inviterId);
  revalidatePath("/battle");
}

export async function rejectInvite(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.INVITE_PENDING) throw new Error("邀請狀態已變更");

  await prisma.match.update({
    where: { id },
    data: { status: MATCH_STATUS.CANCELLED },
  });

  await publishMatchSnapshot(id);
  revalidatePath("/battle");
}

export async function setReady(matchId: string, ready: boolean) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");

  const { started } = await setReadyForUser(id, userId, ready);

  if (started) {
    const isA = match.playerAId === userId;
    const otherPlayerId = isA ? match.playerBId : match.playerAId;
    await prisma.notification.create({
      data: {
        userId: otherPlayerId,
        type: "MATCH_COMPLETED",
        referenceId: id.toString(),
        senderId: userId,
        data: JSON.stringify(`對戰已成立，現在開始對戰`),
        read: false,
      },
    });
    await publishNotification(otherPlayerId);
  }

  await publishMatchSnapshot(id);
  revalidatePath("/battle");
}

export async function cancelMatch(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  
  if (match.status === MATCH_STATUS.INVITE_PENDING) {
    // In INVITE_PENDING state, only the inviter can cancel
    if (match.invitedById !== userId) {
      throw new Error("只有邀請者可以取消邀請");
    }
    await prisma.match.update({
      where: { id },
      data: { status: MATCH_STATUS.CANCELLED },
    });
  } else if (match.status === MATCH_STATUS.ACCEPTED || match.status === MATCH_STATUS.IN_PROGRESS) {
    // Both players need to agree to cancel
    const otherPlayerId = match.playerAId === userId ? match.playerBId : match.playerAId;
    
    // If no cancellation request exists, create one
    if (!match.cancelRequestedBy) {
      await prisma.match.update({
        where: { id },
        data: { cancelRequestedBy: userId },
      });
      
      // Send notification to other player
      await prisma.notification.create({
        data: {
          userId: otherPlayerId,
          type: "MATCH_CREATED",
          referenceId: id.toString(),
          senderId: userId,
          data: JSON.stringify("對方請求取消約戰"),
          read: false,
        },
      });
      await publishNotification(otherPlayerId);
    } else if (match.cancelRequestedBy === userId) {
      // Same player requesting again - cancel their request
      await prisma.match.update({
        where: { id },
        data: { cancelRequestedBy: null },
      });
    } else {
      // Other player agreed to cancel
      await prisma.match.update({
        where: { id },
        data: { status: MATCH_STATUS.CANCELLED, cancelRequestedBy: null },
      });
      
      // Send notification to other player
      await prisma.notification.create({
        data: {
          userId: otherPlayerId,
          type: "MATCH_CREATED",
          referenceId: id.toString(),
          senderId: userId,
          data: JSON.stringify("約戰已取消"),
          read: false,
        },
      });
      await publishNotification(otherPlayerId);
    }
  } else {
    throw new Error("無法取消此約戰");
  }

  await publishMatchSnapshot(id);
  revalidatePath("/battle");
}

export async function rejectCancelRequest(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  
  if (!match.cancelRequestedBy || match.cancelRequestedBy === userId) {
    throw new Error("沒有取消請求");
  }

  // Clear the cancel request
  await prisma.match.update({
    where: { id },
    data: { cancelRequestedBy: null },
  });

  // Send notification to the other player
  const otherPlayerId = match.playerAId === userId ? match.playerBId : match.playerAId;
  await prisma.notification.create({
    data: {
      userId: otherPlayerId,
      type: "MATCH_CREATED",
      referenceId: id.toString(),
      senderId: userId,
      data: JSON.stringify("對方拒絕了取消約戰的請求"),
      read: false,
    },
  });

  await publishMatchSnapshot(id);
  await publishNotification(otherPlayerId);
  revalidatePath("/battle");
}

export async function finishMatch(
  matchId: string,
  winnerId: number | null,
  _addFriend: boolean,
): Promise<FinishMatchResult> {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw new Error("請待雙方都準備完成、對戰開始後再紀錄結果");
  }

  // winnerId must be one of the participants or null (for draw)
  if (winnerId !== null && winnerId !== match.playerAId && winnerId !== match.playerBId) {
    throw new Error("無效的贏家ID");
  }

  const otherId =
    match.playerAId === userId ? match.playerBId : match.playerAId;

  let completed = false;

  await prisma.$transaction(async (tx) => {
    const isPlayerA = userId === match.playerAId;

    // Create or update battle result
    const existing = await tx.battleResult.findUnique({ where: { matchId: id } });
    
    if (!existing) {
      // First submission - create with this player's agreement
      await tx.battleResult.create({
        data: {
          matchId: id,
          winnerId,
          playerAAgreed: isPlayerA ? true : false,
          playerBAgreed: !isPlayerA ? true : false,
          status: "PENDING",
        },
      });

      // Send notification to other player
      await tx.notification.create({
        data: {
          userId: otherId,
          type: "BATTLE_RESULT",
          referenceId: id.toString(),
          senderId: userId,
          data: JSON.stringify(`對方已送出對戰結果，請確認`),
          read: false,
        },
      });
    } else {
      // Second submission - check if both agree on the winner
      const playerAAgrees = isPlayerA ? true : existing.playerAAgreed;
      const playerBAgrees = !isPlayerA ? true : existing.playerBAgreed;

      if (existing.winnerId !== winnerId) {
        // Conflicting winners - throw error
        throw new Error("雙方送出之結果不相符，請重新選擇");
      }

      const newStatus = "AGREED";

      // Both agreed on same winner
      await tx.battleResult.update({
        where: { matchId: id },
        data: {
          playerAAgreed: playerAAgrees,
          playerBAgreed: playerBAgrees,
          status: newStatus,
        },
      });

      // Complete match once both agree
      await tx.match.update({
        where: { id },
        data: { status: MATCH_STATUS.COMPLETED },
      });

      completed = true;

      // Send notification to other player
      await tx.notification.create({
        data: {
          userId: otherId,
          type: "BATTLE_RESULT",
          referenceId: id.toString(),
          senderId: userId,
          data: JSON.stringify(`對戰結果已確認`),
          read: false,
        },
      });
    }
  });

  if (completed) {
    const published = await publishMatchCompleted(id);
    void publishMatchSnapshot(id);
    void publishNotification(otherId);

    const share =
      published
        ? userId === published.playerAId
          ? published.shareA
          : published.shareB
        : await getMatchSharePayload(id, userId);
    if (share) {
      revalidatePath("/battle");
      revalidatePath("/profile");
      revalidatePath("/friends");
      revalidatePath(`/battle/result/${id}`);
      return { completed: true, share };
    }
  } else {
    await publishMatchSnapshot(id);
    await publishNotification(otherId);
  }

  revalidatePath("/battle");
  revalidatePath("/profile");
  revalidatePath("/friends");
  return { completed: false };
}

export async function resetBattleResult(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw new Error("無法重設對戰結果");
  }

  // Delete the battle result to allow both players to re-select
  await prisma.battleResult.deleteMany({
    where: { matchId: id },
  });

  await publishMatchSnapshot(id);
  revalidatePath("/battle");
}

export async function requestFriendAfterMatch(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
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

export async function updateMatchNotes(
  matchId: string,
  notes: string,
  visibility: string,
): Promise<MatchSharePayload> {
  const userId = await requireUserId();
  const id = parseInt(matchId, 10);
  if (Number.isNaN(id)) throw new Error("無效的對戰編號");

  const match = await prisma.match.findUnique({
    where: { id },
    include: { battleResults: true },
  });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.COMPLETED) throw new Error("約戰尚未完成");

  const br = match.battleResults[0];
  if (!br || br.status !== "AGREED") throw new Error("對戰結果尚未確認");

  if (!isValidNoteVisibility(visibility)) throw new Error("無效的公開設定");

  const trimmed = notes.trim().slice(0, MATCH_NOTE_MAX_LENGTH);
  const { field } = getBattleResultNoteFields(
    br,
    match.playerAId,
    match.playerBId,
    userId,
  );

  await prisma.battleResult.update({
    where: { matchId: id },
    data: battleResultNoteUpdateData(field, trimmed, visibility),
  });

  const share = await getMatchSharePayload(id, userId);
  if (!share) throw new Error("找不到對戰結果");

  revalidatePath("/battle");
  revalidatePath("/profile");
  revalidatePath(`/battle/result/${id}`);
  return share;
}
