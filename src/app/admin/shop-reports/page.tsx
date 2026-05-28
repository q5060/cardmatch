import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminShopReportList } from "./AdminShopReportList";
import { AdminNav } from "@/components/admin/AdminNav";

async function isAdmin(email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return adminEmails.includes(email);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待處理",
  RESOLVED: "已處理",
  DISMISSED: "已忽略",
};

export default async function AdminShopReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user || !(await isAdmin(user.email))) redirect("/");

  const params = await searchParams;
  const status = (params.status ?? "PENDING") as "PENDING" | "RESOLVED" | "DISMISSED";

  const reports = await prisma.shopReport.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, displayName: true, email: true } },
      shop: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <AdminNav active="shop-reports" />
      <h1 className="text-xl font-semibold">店家回報管理</h1>

      {/* Status tabs */}
      <div className="flex gap-2 text-sm">
        {(["PENDING", "RESOLVED", "DISMISSED"] as const).map((s) => (
          <a
            key={s}
            href={`/admin/shop-reports?status=${s}`}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              status === s
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABEL[s]}
          </a>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">沒有{STATUS_LABEL[status]}的回報。</p>
      ) : (
        <AdminShopReportList reports={reports} status={status} />
      )}
    </main>
  );
}
