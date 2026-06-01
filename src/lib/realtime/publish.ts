import prisma from "@/lib/prisma";
import {
  fetchActiveMatchPayload,
  type ActiveMatchDTO,
  type BattleResultDTO,
} from "@/lib/matchDto";
import { getMatchSharePayload } from "@/lib/matchShare";
import { getBus } from "./getBus";
import type { ChatMessageDTO, RealtimeEvent } from "./types";

export function publishToUser(userId: number, event: RealtimeEvent) {
  getBus().publish(userId, event);
}

export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function publishNotification(userId: number) {
  const unreadCount = await getUnreadCount(userId);
  publishToUser(userId, { type: "notification.new", unreadCount });
}

async function publishMatchUpdatedToPlayer(
  userId: number,
  matchId: number,
  activeMatch: ActiveMatchDTO | null,
  battleResult: BattleResultDTO,
) {
  publishToUser(userId, {
    type: "match.updated",
    matchId,
    activeMatch,
    battleResult,
  });
}

/** Notify both players to open the result share screen. */
export async function publishMatchCompleted(matchId: number) {
  const share = await getMatchSharePayload(matchId);
  if (!share) return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { playerAId: true, playerBId: true },
  });
  if (!match) return;

  const event: RealtimeEvent = { type: "match.completed", matchId, share };
  publishToUser(match.playerAId, event);
  publishToUser(match.playerBId, event);
}

/** Push current match snapshot to both participants (or cleared state if match ended). */
export async function publishMatchSnapshot(matchId: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { playerAId: true, playerBId: true },
  });
  if (!match) return;

  const playerIds = [match.playerAId, match.playerBId];
  await Promise.all(
    playerIds.map(async (userId) => {
      const payload = await fetchActiveMatchPayload(userId);
      publishMatchUpdatedToPlayer(
        userId,
        matchId,
        payload.activeMatch,
        payload.battleResult,
      );
    }),
  );
}

export function publishMatchMessage(
  matchId: number,
  playerAId: number,
  playerBId: number,
  message: ChatMessageDTO,
) {
  const event: RealtimeEvent = {
    type: "message.new",
    channel: "match",
    matchId,
    message,
  };
  publishToUser(playerAId, event);
  publishToUser(playerBId, event);
}

export function publishFriendMessage(
  friendshipId: string,
  requesterId: number,
  addresseeId: number,
  message: ChatMessageDTO,
) {
  const event: RealtimeEvent = {
    type: "message.new",
    channel: "friend",
    friendshipId,
    message,
  };
  publishToUser(requesterId, event);
  publishToUser(addresseeId, event);
}
