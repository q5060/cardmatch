import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { MATCH_CHAT_ALLOWED_STATUSES } from "@/lib/constants";
import {
  publishMatchMessage,
  publishNotification,
} from "@/lib/realtime/publish";

const CHAT_OK = new Set<string>(MATCH_CHAT_ALLOWED_STATUSES);

async function assertParticipant(matchId: string, userId: number) {
  const id = parseInt(matchId);
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match || (match.playerAId !== userId && match.playerBId !== userId)) {
    return null;
  }
  if (!CHAT_OK.has(match.status)) return null;
  return match;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { matchId } = await ctx.params;
  const id = parseInt(matchId);
  const match = await assertParticipant(matchId, session.userId);
  if (!match) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { searchParams } = new URL(_request.url);
  const afterTime = searchParams.get("afterTime");
  const afterDate =
    afterTime && !Number.isNaN(Date.parse(afterTime))
      ? new Date(afterTime)
      : null;

  const messages = await prisma.message.findMany({
    where: {
      matchId: id,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: { select: { id: true, displayName: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt,
      sender: m.sender,
    })),
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ matchId: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { matchId } = await ctx.params;
  const id = parseInt(matchId);
  const match = await assertParticipant(matchId, session.userId);
  if (!match) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const text = (body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "EMPTY" }, { status: 400 });
  }

  const msg = await prisma.message.create({
    data: {
      matchId: id,
      senderId: session.userId,
      body: text.slice(0, 4000),
    },
    include: {
      sender: { select: { id: true, displayName: true } },
    },
  });

  // Send notification to the other player
  const otherPlayerId = match.playerAId === session.userId ? match.playerBId : match.playerAId;
  const senderName = msg.sender.displayName;
  
  await prisma.notification.create({
    data: {
      userId: otherPlayerId,
      type: "MESSAGE",
      referenceId: msg.id,
      senderId: session.userId,
      data: JSON.stringify(`${senderName} 在約戰中傳來訊息`),
      read: false,
    },
  });

  const messageDto = {
    id: msg.id,
    senderId: msg.senderId,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
    sender: msg.sender,
  };
  publishMatchMessage(id, match.playerAId, match.playerBId, messageDto);
  await publishNotification(otherPlayerId);

  return NextResponse.json({ message: msg });
}
