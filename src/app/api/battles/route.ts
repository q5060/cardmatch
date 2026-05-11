import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const { matchId, winnerId, addFriend } = body;

    if (!matchId || typeof winnerId !== "number") {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    // Verify match exists and user is participant
    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId) },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (
      match.playerAId !== session.userId &&
      match.playerBId !== session.userId
    ) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    if (match.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Match is not in progress" },
        { status: 400 }
      );
    }

    // Verify winnerId is one of the participants
    if (winnerId !== match.playerAId && winnerId !== match.playerBId) {
      return NextResponse.json(
        { error: "Invalid winner ID" },
        { status: 400 }
      );
    }

    const otherId =
      match.playerAId === session.userId ? match.playerBId : match.playerAId;
    const isPlayerA = session.userId === match.playerAId;

    // Create or update battle result
    let battleResult = await prisma.battleResult.findUnique({
      where: { matchId: parseInt(matchId) },
    });

    if (!battleResult) {
      // First submission - create with this player's agreement
      battleResult = await prisma.battleResult.create({
        data: {
          matchId,
          winnerId,
          playerAAgreed: isPlayerA ? true : false,
          playerBAgreed: !isPlayerA ? true : false,
          status: "PENDING",
        },
      });
    } else {
      // Second submission - check if both agree
      const playerAAgrees = isPlayerA ? true : battleResult.playerAAgreed;
      const playerBAgrees = !isPlayerA ? true : battleResult.playerBAgreed;

      const newStatus =
        playerAAgrees && playerBAgrees && battleResult.winnerId === winnerId
          ? "AGREED"
          : "PENDING";

      battleResult = await prisma.battleResult.update({
        where: { matchId },
        data: {
          winnerId: battleResult.winnerId === winnerId ? winnerId : battleResult.winnerId,
          playerAAgreed: playerAAgrees,
          playerBAgreed: playerBAgrees,
          status: newStatus,
        },
      });
    }

    // If both agreed, complete the match
    if (battleResult.status === "AGREED") {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: "COMPLETED" },
      });

      // Add friend if requested
      if (addFriend) {
        const existing = await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: session.userId, addresseeId: otherId },
              { requesterId: otherId, addresseeId: session.userId },
            ],
          },
        });

        if (!existing) {
          await prisma.friendship.create({
            data: {
              requesterId: session.userId,
              addresseeId: otherId,
              status: "PENDING",
            },
          });
        }
      }

      // Create notification for the other player
      if (battleResult.winnerId === session.userId) {
        await prisma.notification.create({
          data: {
            userId: otherId,
            senderId: session.userId,
            type: "BATTLE_RESULT",
            referenceId: matchId.toString(),
            data: JSON.stringify({
              message: "戰鬥已完成，您輸了",
              winnerId: battleResult.winnerId,
            }),
            read: false,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: otherId,
            senderId: session.userId,
            type: "BATTLE_RESULT",
            referenceId: matchId.toString(),
            data: JSON.stringify({
              message: "戰鬥已完成，您贏了",
              winnerId: battleResult.winnerId,
            }),
            read: false,
          },
        });
      }
    }

    return NextResponse.json({
      battleResult: {
        id: battleResult.id,
        matchId: battleResult.matchId,
        winnerId: battleResult.winnerId,
        playerAAgreed: battleResult.playerAAgreed,
        playerBAgreed: battleResult.playerBAgreed,
        status: battleResult.status,
      },
    });
  } catch (error) {
    console.error("Battle result submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
