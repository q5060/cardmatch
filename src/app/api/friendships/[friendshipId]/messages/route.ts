import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function assertFriendship(friendshipId: string, userId: string) {
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

  const { searchParams } = new URL(request.url);
  const afterTime = searchParams.get("afterTime");
  const afterDate =
    afterTime && !Number.isNaN(Date.parse(afterTime))
      ? new Date(afterTime)
      : null;

  const messages = await prisma.friendMessage.findMany({
    where: {
      friendshipId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: { select: { id: true, displayName: true } },
    },
  });

  return NextResponse.json({ messages });
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

  return NextResponse.json({ message: msg });
}
