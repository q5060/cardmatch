"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { MATCH_STATUS, BATTLE_OUTCOME, QUEUE_MODE } from "@/lib/constants";
import { countActiveMatchesForUser } from "@/lib/queries";
import { tryRandomPair } from "@/lib/matchmaking";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

function isParticipant(m: { playerAId: number; playerBId: number }, userId: number) {
  return m.playerAId === userId || m.playerBId === userId;
}

export async function joinRandomQueue(lat: number, lng: number, radiusKm: number) {
  const userId = await requireUserId();

  if ((await countActiveMatchesForUser(userId)) > 0) {
    throw new Error("已有進行中的約戰，無法加入隨機排隊");
  }

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

export async function sendLobbyInvite(targetUserId: number) {
  const userId = await requireUserId();
  if (targetUserId === userId) throw new Error("無法邀請自己");

  const mySpot = await prisma.meetSpot.findFirst({
    where: { userId, looking: true, active: true },
  });
  const theirSpot = await prisma.meetSpot.findFirst({
    where: { userId: targetUserId, looking: true, active: true },
  });
  if (!mySpot || !theirSpot) throw new Error("雙方都需公開約戰地點到大廳");

  if ((await countActiveMatchesForUser(userId)) > 0) {
    throw new Error("你已有進行中的約戰");
  }
  if ((await countActiveMatchesForUser(targetUserId)) > 0) {
    throw new Error("對方已有進行中的約戰");
  }

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

  const match = await prisma.match.create({
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

  // Send notification to target user with sender name
  const inviter = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "MATCH_CREATED",
      referenceId: match.id.toString(),
      senderId: userId,
      data: JSON.stringify(`${inviter?.displayName} 邀請你對戰`),
      read: false,
    },
  });

  revalidatePath("/battle");
}

export async function acceptInvite(matchId: string) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.INVITE_PENDING) throw new Error("邀請狀態已變更");
  if (match.invitedById === userId) throw new Error("不能接受自己發出的邀請");

  await prisma.match.update({
    where: { id },
    data: { status: MATCH_STATUS.ACCEPTED, playerAReady: false, playerBReady: false },
  });

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

  revalidatePath("/battle");
}

export async function setReady(matchId: string, ready: boolean) {
  const userId = await requireUserId();
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || !isParticipant(match, userId)) throw new Error("找不到約戰");
  if (match.status !== MATCH_STATUS.ACCEPTED) throw new Error("目前無法切換準備狀態");

  const isA = match.playerAId === userId;
  const data = isA ? { playerAReady: ready } : { playerBReady: ready };

  await prisma.match.update({
    where: { id },
    data,
  });

  const updated = await prisma.match.findUnique({ where: { id } });
  if (
    updated?.status === MATCH_STATUS.ACCEPTED &&
    updated.playerAReady &&
    updated.playerBReady
  ) {
    await prisma.match.update({
      where: { id },
      data: { status: MATCH_STATUS.IN_PROGRESS },
    });

    // Send notification to both players when battle starts
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
  }

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
    }
  } else {
    throw new Error("無法取消此約戰");
  }

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

  revalidatePath("/battle");
}

export async function finishMatch(
  matchId: string,
  winnerId: number | null,
  addFriend: boolean,
) {
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

  revalidatePath("/battle");
  revalidatePath("/profile");
  revalidatePath("/friends");
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
