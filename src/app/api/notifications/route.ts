import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip = parseInt(searchParams.get("skip") || "0");

    // Get notifications from database
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip,
    });

    // Mark as read
    await prisma.notification.updateMany({
      where: {
        userId: session.userId,
      },
      data: {
        read: true,
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
