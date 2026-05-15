import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const trimmedQuery = query.trim().toLowerCase();

    // Search for users
    const users = await prisma.user.findMany({
      where: {
        displayName: {
          contains: trimmedQuery,
        },
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
      take: 10,
    });

    // Search for meet spots
    const spots = await prisma.meetSpot.findMany({
      where: {
        label: {
          contains: trimmedQuery,
        },
        active: true,
        looking: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        label: true,
      },
      take: 10,
    });

    // Format results
    const results = [
      ...users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        type: "user" as const,
      })),
      ...spots.map((s) => ({
        id: s.id,
        label: s.label,
        type: "spot" as const,
      })),
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
