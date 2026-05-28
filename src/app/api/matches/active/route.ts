import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchActiveMatchPayload } from "@/lib/matchDto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const payload = await fetchActiveMatchPayload(session.userId);
  return NextResponse.json(payload);
}
