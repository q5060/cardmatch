import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateTemporaryPassword } from "@/lib/generatePassword";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_OK = {
  ok: true,
  message: "若此電子郵件已註冊，我們已寄出密碼重設信，請查收信箱。",
};

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "請輸入有效的電子郵件" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, suspendedUntil: true },
    });

    if (
      user &&
      (!user.suspendedUntil || user.suspendedUntil <= new Date())
    ) {
      const temporaryPassword = generateTemporaryPassword(12);
      const passwordHash = await hashPassword(temporaryPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await sendPasswordResetEmail(email, temporaryPassword);
    }
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json(
      { error: "寄信失敗，請稍後再試或聯絡管理員" },
      { status: 500 },
    );
  }

  return NextResponse.json(GENERIC_OK);
}
