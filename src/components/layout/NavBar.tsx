"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  LogOut,
  Search,
  UserCircle,
  Users,
} from "lucide-react";

const links: {
  href: string;
  label: string;
  auth?: boolean;
  Icon: typeof Home;
}[] = [
  { href: "/", label: "首頁", Icon: Home },
  { href: "/battle", label: "對戰", Icon: Search, auth: true },
  { href: "/friends", label: "好友", Icon: Users, auth: true },
  { href: "/profile", label: "個人檔案", Icon: UserCircle, auth: true },
];

type Props = {
  user?: { id: string; displayName: string } | null;
  pendingInvites?: number;
};

export function NavBar({ user, pendingInvites = 0 }: Props) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[var(--nav)]/90 shadow-sm shadow-black/[0.03] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--nav)]/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-3.5">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[11px] font-bold tracking-tight text-white shadow-md shadow-primary/25 transition group-hover:bg-primary-hover"
            aria-hidden
          >
            CM
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">CardMatch</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {links.map(({ href, label, auth, Icon }) => {
            if (auth && !user) return null;
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <nav className="flex flex-1 flex-wrap items-center justify-center gap-1 md:hidden">
          {links.map(({ href, label, auth, Icon }) => {
            if (auth && !user) return null;
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`rounded-full p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
                  active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-black/[0.04]"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <span
                className="hidden max-w-[9rem] truncate text-xs font-medium text-muted-foreground lg:inline"
                title={user.displayName}
              >
                {user.displayName}
              </span>
              <Link
                href="/battle"
                className="btn btn-ghost relative text-foreground"
                title={pendingInvites > 0 ? `約戰邀請（${pendingInvites}）` : "對戰大廳"}
                aria-label={pendingInvites > 0 ? `約戰邀請 ${pendingInvites} 筆，前往對戰` : "前往對戰"}
              >
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {pendingInvites > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
                    {pendingInvites > 9 ? "9+" : pendingInvites}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="btn btn-outline btn-sm gap-1.5 font-semibold text-secondary"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">登出</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost text-sm font-semibold text-muted-foreground">
                登入
              </Link>
              <Link href="/register" className="btn btn-primary text-sm font-semibold">
                註冊
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
