"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!user || !adminEmails.includes(user.email)) throw new Error("無管理員權限");
}

export async function suspendUser(userId: number, days: number) {
  await requireAdmin();
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { suspendedUntil: until } });
  revalidatePath("/admin/user-reports");
}

export async function unsuspendUser(userId: number) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { suspendedUntil: null } });
  revalidatePath("/admin/user-reports");
}
