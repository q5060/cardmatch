import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * @route POST /api/auth/update-profile
 * @description Update user profile (displayName, bio, avatar)
 * @body FormData with: displayName (string), bio (string), avatar (File, optional)
 * @returns Updated user object
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await request.formData();
    const displayName = formData.get("displayName") as string;
    const bio = formData.get("bio") as string;
    const avatarFile = formData.get("avatar") as File | null;

    // Validate inputs
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "DisplayName is required" },
        { status: 400 }
      );
    }

    if (displayName.length > 50) {
      return NextResponse.json(
        { error: "DisplayName must be 50 characters or less" },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less" },
        { status: 400 }
      );
    }

    let avatarUrl: string | null = null;

    // Handle avatar upload if provided
    if (avatarFile) {
      if (avatarFile.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Avatar file must be less than 2MB" },
          { status: 400 }
        );
      }

      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(avatarFile.type)) {
        return NextResponse.json(
          { error: "Avatar must be JPEG, PNG, or WebP" },
          { status: 400 }
        );
      }

      // Convert to base64 for storage (simple approach)
      // In production, use external storage like S3
      const buffer = await avatarFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      avatarUrl = `data:${avatarFile.type};base64,${base64}`;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        displayName: displayName.trim(),
        bio: bio ? bio.trim() : "",
        ...(avatarUrl && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        battleRecordVisibility: true,
        winrateVisibility: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
