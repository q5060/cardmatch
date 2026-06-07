import { Suspense } from "react";
import { GlobalMatchCeremonyLoader } from "./GlobalMatchCeremonyLoader";
import { NavBar } from "./NavBar";
import { PageTransition } from "./PageTransition";
import { RealtimeShell } from "./RealtimeShell";

type UserBrief = { id: number; displayName: string; avatarUrl: string | null };

export function AppShell({
  user,
  children,
}: {
  user: UserBrief | null;
  children: React.ReactNode;
}) {
  return (
    <RealtimeShell enabled={!!user}>
      {user ? (
        <Suspense fallback={null}>
          <GlobalMatchCeremonyLoader userId={user.id} />
        </Suspense>
      ) : null}
      <div className="flex min-h-screen flex-col">
        <NavBar user={user} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="border-t border-black/[0.06] bg-card py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">CardMatch © 2026</p>
              <p className="mt-1 text-xs text-muted-foreground">寶可夢卡牌實體約戰</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2" />
          </div>
        </footer>
      </div>
    </RealtimeShell>
  );
}
