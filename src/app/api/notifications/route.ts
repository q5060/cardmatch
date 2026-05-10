import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 獲取待決的好友請求
    const pendingFriendRequests = await prisma.friendship.findMany({
      where: {
        addresseeId: session.userId,
        status: "PENDING",
      },
      include: {
        requester: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 獲取未讀消息計數
    const unreadMessages = await prisma.friendMessage.count({
      where: {
        friendshipId: {
          in: (
            await prisma.friendship.findMany({
              where: {
                OR: [
                  { requesterId: session.userId },
                  { addresseeId: session.userId },
                ],
              },
              select: { id: true },
            })
          ).map((f) => f.id),
        },
        // 假設我們有read欄位的話
      },
    });

    // 構建通知物件
    const notifications = [
      ...pendingFriendRequests.map((req) => ({
        id: `friend-request-${req.id}`,
        type: "FRIEND_REQUEST" as const,
        title: "新好友請求",
        message: `${req.requester.displayName} 要求添加您為好友`,
        user: req.requester,
        timestamp: req.createdAt.toISOString(),
        actionId: req.id,
      })),
      ...(unreadMessages > 0
        ? [
            {
              id: "unread-messages",
              type: "UNREAD_MESSAGE" as const,
              title: "新訊息",
              message: `您有 ${unreadMessages} 條未讀訊息`,
              user: null,
              timestamp: new Date().toISOString(),
              actionId: null,
            },
          ]
        : []),
    ];

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    console.error("通知獲取錯誤:", error);
    return NextResponse.json({ error: "內部伺服器錯誤" }, { status: 500 });
  }
}
