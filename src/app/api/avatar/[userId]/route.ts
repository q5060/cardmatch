import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: idStr } = await params;
  const userId = parseInt(idStr, 10);
  if (isNaN(userId)) return new NextResponse("Not Found", { status: 404 });

  const avatar = await prisma.avatar.findUnique({
    where: { userId },
    select: { data: true, mimeType: true },
  });

  if (!avatar) return new NextResponse("Not Found", { status: 404 });

  return new NextResponse(avatar.data as unknown as BodyInit, {
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
