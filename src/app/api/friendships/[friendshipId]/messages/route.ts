import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  publishFriendMessage,
  publishNotification,
} from "@/lib/realtime/publish";
import { assertNotBlocked } from "@/lib/block";

async function assertFriendship(friendshipId: string, userId: number) {
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (
    !f ||
    f.status !== "ACCEPTED" ||
    (f.requesterId !== userId && f.addresseeId !== userId)
  ) {
    return null;
  }
  return f;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ friendshipId: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { friendshipId } = await ctx.params;
  const ok = await assertFriendship(friendshipId, session.userId);
  if (!ok) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const otherId =
    ok.requesterId === session.userId ? ok.addresseeId : ok.requesterId;
  try {
    await assertNotBlocked(session.userId, otherId);
  } catch {
    return NextResponse.json({ error: "BLOCKED" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const afterTime = searchParams.get("afterTime");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "30");
  
  const afterDate =
    afterTime && !Number.isNaN(Date.parse(afterTime))
      ? new Date(afterTime)
      : null;

  // Get total count
  const totalCount = await prisma.friendMessage.count({
    where: {
      friendshipId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
  });

  // Get paginated messages (oldest first)
  const messages = await prisma.friendMessage.findMany({
    where: {
      friendshipId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    skip: offset,
    take: limit,
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
    totalCount,
    offset,
    limit,
    hasMore: offset + limit < totalCount,
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ friendshipId: string }> },
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { friendshipId } = await ctx.params;
  const ok = await assertFriendship(friendshipId, session.userId);
  if (!ok) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const otherIdPost =
    ok.requesterId === session.userId ? ok.addresseeId : ok.requesterId;
  try {
    await assertNotBlocked(session.userId, otherIdPost);
  } catch {
    return NextResponse.json({ error: "BLOCKED" }, { status: 403 });
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

  const f = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    include: { requester: { select: { displayName: true } }, addressee: { select: { displayName: true } } },
  });

  const msg = await prisma.friendMessage.create({
    data: {
      friendshipId,
      senderId: session.userId,
      body: text.slice(0, 4000),
    },
    include: {
      sender: { select: { id: true, displayName: true } },
    },
  });

  // Send notification to the other user
  const receiverId = f!.requesterId === session.userId ? f!.addresseeId : f!.requesterId;
  const senderName = f!.requesterId === session.userId ? f!.requester.displayName : f!.addressee.displayName;
  
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "MESSAGE",
      referenceId: msg.id,
      senderId: session.userId,
      data: JSON.stringify(`${senderName} 傳來一條私訊`),
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
  publishFriendMessage(
    friendshipId,
    f!.requesterId,
    f!.addresseeId,
    messageDto,
  );
  await publishNotification(receiverId);

  return NextResponse.json({ message: msg });
}
