import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        battleRecordVisibility: true,
        winrateVisibility: true,
        defaultShopId: true,
        suspendedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return NextResponse.json({ error: "SUSPENDED" }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      battleRecordVisibility: user.battleRecordVisibility,
      winrateVisibility: user.winrateVisibility,
      defaultShopId: user.defaultShopId,
      isAdmin: adminEmails.includes(user.email),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
