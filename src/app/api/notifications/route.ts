import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { notificationId } = await req.json();
    
    await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return NextResponse.json(
      { error: "無法更新通知" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip = parseInt(searchParams.get("skip") || "0");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Get notifications from database
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip,
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.userId,
        read: false,
      },
    });

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        senderId: n.senderId,
        referenceId: n.referenceId,
        data: n.data ? JSON.parse(n.data) : null,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Notification fetch error:", error);
    return NextResponse.json(
      { error: "無法獲取通知" },
      { status: 500 }
    );
  }
}
