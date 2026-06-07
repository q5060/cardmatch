import { GlobalMatchCeremony } from "./GlobalMatchCeremony";
import { NavBar } from "./NavBar";
import { PageTransition } from "./PageTransition";
import { RealtimeShell } from "./RealtimeShell";
import prisma from "@/lib/prisma";
import { fetchActiveMatchSummaryForShell } from "@/lib/matchDto";

type UserBrief = { id: number; displayName: string; avatarUrl: string | null };

export async function AppShell({
  user,
  children,
}: {
  user: UserBrief | null;
  children: React.ReactNode;
}) {
  let pendingInvites = 0;
  let initialActiveMatch = null;
  if (user) {
    const [notificationCount, activeMatchSummary] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: user.id,
          read: false,
        },
      }),
      fetchActiveMatchSummaryForShell(user.id),
    ]);
    pendingInvites = notificationCount;
    initialActiveMatch = activeMatchSummary;
  }

  return (
    <RealtimeShell enabled={!!user}>
    {user ? (
      <GlobalMatchCeremony
        userId={user.id}
        initialActiveMatch={initialActiveMatch}
      />
    ) : null}
    <div className="flex min-h-screen flex-col">
      <NavBar user={user} pendingInvites={pendingInvites} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="border-t border-black/[0.06] bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">CardMatch © 2026</p>
            <p className="mt-1 text-xs text-muted-foreground">寶可夢卡牌實體約戰</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* <Link
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
            </Link> */}
            {/* <div className="flex items-center gap-3 border-l border-black/[0.06] pl-6">
              <a
                href="#"
                className="text-muted-foreground transition hover:text-primary"
                aria-label="社群連結（Placeholder）"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.75} />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition hover:text-primary"
                aria-label="網站連結（Placeholder）"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition hover:text-primary"
                aria-label="聯絡（Placeholder）"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              </a>
            </div> */}
          </div>
        </div>
      </footer>
    </div>
    </RealtimeShell>
  );
}
