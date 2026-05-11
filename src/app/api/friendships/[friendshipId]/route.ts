import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { friendshipId } = await params;
    const body = await req.json();
    const { action } = body;

    if (!["ACCEPT", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "無效的操作" }, { status: 400 });
    }

    // 獲取好友關係
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "好友關係不存在" }, { status: 404 });
    }

    // 驗證請求方
    if (friendship.addresseeId !== session.userId) {
      return NextResponse.json({ error: "無權限執行此操作" }, { status: 403 });
    }

    if (friendship.status !== "PENDING") {
      return NextResponse.json(
        { error: "好友請求已處理" },
        { status: 400 }
      );
    }

    // 執行操作
    if (action === "ACCEPT") {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED" },
      });
    } else if (action === "REJECT") {
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });
    }

    return NextResponse.json({
      success: true,
      message: `好友請求已${action === "ACCEPT" ? "接受" : "拒絕"}`,
    });
  } catch (error) {
    console.error("處理好友請求錯誤:", error);
    return NextResponse.json({ error: "內部伺服器錯誤" }, { status: 500 });
  }
}
