"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  return session.userId;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) throw new Error("請先登入");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!user || !adminEmails.includes(user.email)) throw new Error("無管理員權限");
  return session.userId;
}

export type ShopReportType = "MISSING" | "INCORRECT" | "CLOSED" | "OTHER";

export async function submitShopReport(input: {
  type: ShopReportType;
  shopId?: string;
  shopName?: string;
  address?: string;
  note?: string;
}) {
  const reporterId = await requireUserId();

  if (input.type === "MISSING" && !input.shopName?.trim()) {
    throw new Error("請填寫店家名稱");
  }
  if ((input.type === "INCORRECT" || input.type === "CLOSED") && !input.shopId) {
    throw new Error("缺少店家資訊");
  }

  const report = await prisma.shopReport.create({
    data: {
      reporterId,
      type: input.type,
      shopId: input.shopId ?? null,
      shopName: input.shopName?.trim() ?? null,
      address: input.address?.trim() ?? null,
      note: input.note?.trim().slice(0, 500) ?? null,
    },
  });

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length > 0) {
    const adminUsers = await prisma.user.findMany({
      where: { email: { in: adminEmails } },
      select: { id: true },
    });
    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((u) => ({
          userId: u.id,
          type: "SHOP_REPORT",
          referenceId: report.id,
          senderId: reporterId,
        })),
      });
    }
  }
}

export async function resolveShopReport(id: string, adminNote?: string) {
  await requireAdmin();
  const trimmed = adminNote?.trim();
  const report = await prisma.shopReport.update({
    where: { id },
    data: { status: "RESOLVED", ...(trimmed ? { adminNote: trimmed } : {}) },
    select: { reporterId: true },
  });
  if (trimmed) {
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: "SHOP_REPORT_REPLY",
        referenceId: id,
        data: JSON.stringify({ body: trimmed }),
      },
    });
  }
  revalidatePath("/admin/shop-reports");
}

export async function dismissShopReport(id: string, adminNote?: string) {
  await requireAdmin();
  const trimmed = adminNote?.trim();
  const report = await prisma.shopReport.update({
    where: { id },
    data: { status: "DISMISSED", ...(trimmed ? { adminNote: trimmed } : {}) },
    select: { reporterId: true },
  });
  if (trimmed) {
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: "SHOP_REPORT_REPLY",
        referenceId: id,
        data: JSON.stringify({ body: trimmed }),
      },
    });
  }
  revalidatePath("/admin/shop-reports");
}

export async function replyToShopReport(id: string, adminNote: string) {
  await requireAdmin();
  const trimmed = adminNote.trim();
  const report = await prisma.shopReport.update({
    where: { id },
    data: { adminNote: trimmed || null },
    select: { reporterId: true },
  });
  if (trimmed) {
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: "SHOP_REPORT_REPLY",
        referenceId: id,
        data: JSON.stringify({ body: trimmed }),
      },
    });
  }
  revalidatePath("/admin/shop-reports");
}

export async function getShopReports(status: "PENDING" | "RESOLVED" | "DISMISSED" = "PENDING") {
  await requireAdmin();
  return prisma.shopReport.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, displayName: true, email: true } },
      shop: { select: { id: true, name: true } },
    },
  });
}
