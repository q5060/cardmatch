import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * @route POST /api/auth/update-privacy
 * @description Update user privacy settings
 * @body {
 *   battleRecordVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE",
 *   winrateVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE"
 * }
 * @returns Updated user privacy settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { battleRecordVisibility, winrateVisibility } = body;

    // Validate visibility values
    const validValues = ["PUBLIC", "FRIENDS", "PRIVATE"];
    if (
      !validValues.includes(battleRecordVisibility) ||
      !validValues.includes(winrateVisibility)
    ) {
      return NextResponse.json(
        { error: "Invalid visibility setting" },
        { status: 400 }
      );
    }

    // Update user privacy settings
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        battleRecordVisibility,
        winrateVisibility,
      },
      select: {
        id: true,
        displayName: true,
        battleRecordVisibility: true,
        winrateVisibility: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}
