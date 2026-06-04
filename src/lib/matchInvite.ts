import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { MATCH_ACTIVE_STATUSES, MATCH_STATUS } from "@/lib/constants";
import { deckIdsForInviteMatch } from "@/lib/matchDeck";
import { publishMatchSnapshot, publishNotification } from "@/lib/realtime/publish";
import { revalidatePath } from "next/cache";

export type MeetLocation = {
  lat: number;
  lng: number;
  label: string;
  shopId: string | null;
};

export type CreateInviteSource = "spot" | "random";

export type CreateInviteParams = {
  inviterId: number;
  targetUserId: number;
  meet: MeetLocation;
  source: CreateInviteSource;
  /** Spot invite only: label shown in notification (defaults to meet.label) */
  spotLabelForNotification?: string;
  /** Spot invite: publisher's deck from announcement */
  publisherDeckId?: string | null;
  /** Spot invite: inviter's optional deck */
  inviterDeckId?: string | null;
  publisherId?: number;
};

type Db = Prisma.TransactionClient | typeof prisma;

async function assertCanCreateInvite(
  db: Db,
  inviterId: number,
  targetUserId: number,
): Promise<{ playerAId: number; playerBId: number }> {
  if (targetUserId === inviterId) throw new Error("無法邀請自己");

  const inviterBusy = await db.match.count({
    where: {
      OR: [{ playerAId: inviterId }, { playerBId: inviterId }],
      status: { in: MATCH_ACTIVE_STATUSES },
    },
  });
  if (inviterBusy > 0) throw new Error("你已有進行中的約戰");

  const targetBusy = await db.match.count({
    where: {
      OR: [{ playerAId: targetUserId }, { playerBId: targetUserId }],
      status: { in: MATCH_ACTIVE_STATUSES },
    },
  });
  if (targetBusy > 0) throw new Error("對方已有進行中的約戰");

  const playerAId = inviterId < targetUserId ? inviterId : targetUserId;
  const playerBId = inviterId < targetUserId ? targetUserId : inviterId;

  const existing = await db.match.findFirst({
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

  return { playerAId, playerBId };
}

/** Create a match. For random matches, status is ACCEPTED immediately (no invite step).
 *  For spot invites, status is INVITE_PENDING and only the invitee is notified. */
export async function createInviteMatch(params: CreateInviteParams, db: Db = prisma) {
  const { inviterId, targetUserId, meet, source } = params;
  const { playerAId, playerBId } = await assertCanCreateInvite(db, inviterId, targetUserId);

  const inviter = await db.user.findUnique({
    where: { id: inviterId },
    select: { displayName: true },
  });
  const inviterName = inviter?.displayName ?? "玩家";
  const labelShort = meet.label.slice(0, 120);

  const isRandom = source === "random";

  const deckIds =
    !isRandom && params.publisherId != null
      ? deckIdsForInviteMatch({
          playerAId,
          playerBId,
          publisherId: params.publisherId,
          inviterId,
          publisherDeckId: params.publisherDeckId,
          inviterDeckId: params.inviterDeckId,
        })
      : { playerADeckId: null as string | null, playerBDeckId: null as string | null };

  const match = await db.match.create({
    data: {
      playerAId,
      playerBId,
      invitedById: inviterId,
      // Random matches skip the invite step — go directly to ACCEPTED
      status: isRandom ? MATCH_STATUS.ACCEPTED : MATCH_STATUS.INVITE_PENDING,
      meetLat: meet.lat,
      meetLng: meet.lng,
      meetLabel: labelShort,
      shopId: meet.shopId,
      playerADeckId: deckIds.playerADeckId,
      playerBDeckId: deckIds.playerBDeckId,
    },
  });

  if (isRandom) {
    // Notify BOTH players that they were matched
    const notifData = JSON.stringify({
      type: "RANDOM_MATCH",
      title: "隨機配對成功！",
      body: `配對地點：${labelShort}`,
      meetLabel: labelShort,
    });
    await db.notification.createMany({
      data: [
        {
          userId: playerAId,
          type: "RANDOM_MATCH",
          referenceId: match.id.toString(),
          senderId: playerBId,
          data: notifData,
          read: false,
        },
        {
          userId: playerBId,
          type: "RANDOM_MATCH",
          referenceId: match.id.toString(),
          senderId: playerAId,
          data: notifData,
          read: false,
        },
      ],
    });
    await publishMatchSnapshot(match.id);
    await publishNotification(playerAId);
    await publishNotification(playerBId);
  } else {
    // Spot invite — only notify the invitee
    const spotLabel = params.spotLabelForNotification ?? meet.label;
    await db.notification.create({
      data: {
        userId: targetUserId,
        type: "SPOT_INVITE",
        referenceId: match.id.toString(),
        senderId: inviterId,
        data: JSON.stringify({
          kind: "spot_invite",
          title: `${inviterName} 回應你的約戰公告`,
          body: `地點：${spotLabel}`,
          meetLabel: spotLabel,
          inviterName,
        }),
        read: false,
      },
    });
    await publishMatchSnapshot(match.id);
    await publishNotification(targetUserId);
  }

  revalidatePath("/battle");
  return match;
}
