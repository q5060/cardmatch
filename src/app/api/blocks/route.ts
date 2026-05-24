import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUsersBlockedByViewer } from "@/lib/block";

/**
 * @route GET /api/blocks
 * @description List users blocked by the current user
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const blocked = await listUsersBlockedByViewer(session.userId);
    return NextResponse.json(blocked);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    return NextResponse.json({ error: "Failed to fetch blocked users" }, { status: 500 });
  }
}
