import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminUserReportList } from "./AdminUserReportList";
import { AdminNav } from "@/components/admin/AdminNav";

async function isAdmin(email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return adminEmails.includes(email);
}

export default async function AdminUserReportsPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user || !(await isAdmin(user.email))) redirect("/");

  // Group reports by reportedId, count per user
  const reportCounts = await prisma.userReport.groupBy({
    by: ["reportedId"],
    _count: { _all: true },
    orderBy: { _count: { reportedId: "desc" } },
  });

  const userIds = reportCounts.map((r) => r.reportedId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      displayName: true,
      email: true,
      createdAt: true,
      suspendedUntil: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = reportCounts.map((r) => ({
    count: r._count._all,
    user: userMap.get(r.reportedId) ?? null,
  })).filter((r) => r.user !== null) as {
    count: number;
    user: {
      id: number;
      displayName: string;
      email: string;
      createdAt: Date;
      suspendedUntil: Date | null;
    };
  }[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <AdminNav active="user-reports" />
      <h1 className="text-xl font-semibold">用戶回報管理</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">目前沒有用戶回報記錄。</p>
      ) : (
        <AdminUserReportList rows={rows} />
      )}
    </main>
  );
}
