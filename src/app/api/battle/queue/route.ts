import { NextResponse } from "next/server";
import { getMyQueueStatus } from "@/actions/matchQueue";

export async function GET() {
  try {
    const status = await getMyQueueStatus();
    return NextResponse.json(status ?? { inQueue: false });
  } catch {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
}
