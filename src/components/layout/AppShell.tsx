import Link from "next/link";
import { NavBar } from "./NavBar";
import prisma from "@/lib/prisma";
import { MATCH_STATUS } from "@/lib/constants";
import { ExternalLink, MessageCircle, Share2 } from "lucide-react";

type UserBrief = { id: string; displayName: string };

export async function AppShell({
  user,
  children,
}: {
  user: UserBrief | null;
  children: React.ReactNode;
}) {
  let pendingInvites = 0;
  if (user) {
    pendingInvites = await prisma.match.count({
      where: {
        status: MATCH_STATUS.INVITE_PENDING,
        OR: [{ playerAId: user.id }, { playerBId: user.id }],
        NOT: { invitedById: user.id },
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar user={user} pendingInvites={pendingInvites} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">{children}</main>
      <footer className="border-t border-black/[0.06] bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">CardMatch © 2026</p>
            <p className="mt-1 text-xs text-muted-foreground">寶可夢卡牌實體約戰（MVP）</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="#"
              className="text-xs font-medium text-muted-foreground transition hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs font-medium text-muted-foreground transition hover:text-primary"
            >
              Terms
            </Link>
            <div className="flex items-center gap-3 border-l border-black/[0.06] pl-6">
              <a
                href="#"
                className="text-muted-foreground transition hover:text-primary"
                aria-label="社群連結（占位）"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.75} />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition hover:text-primary"
                aria-label="網站連結（占位）"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition hover:text-primary"
                aria-label="聯絡（占位）"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
