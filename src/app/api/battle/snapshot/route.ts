import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMapAnnouncements, getMyActiveAnnouncement, getBlockedUserIds } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const blockedIds = await getBlockedUserIds(session.userId);
  const [announcements, myAnnouncement] = await Promise.all([
    getMapAnnouncements(session.userId, blockedIds),
    getMyActiveAnnouncement(session.userId),
  ]);

  return NextResponse.json({ announcements, myAnnouncement });
}
