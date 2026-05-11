"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  LogOut,
  Search,
  UserCircle,
  Users,
  Settings,
  Plus,
  Mail,
  Users2,
} from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";

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
  user?: { id: number; displayName: string; avatarUrl: string | null } | null;
  pendingInvites?: number;
};

export function NavBar({ user, pendingInvites = 0 }: Props) {
  const pathname = usePathname();
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotificationMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showNotificationMenu || showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotificationMenu, showUserMenu]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[var(--nav)]/90 shadow-sm shadow-black/[0.03] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--nav)]/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          <Image
            src="/logo.svg"
            alt="CardMatch"
            width={144}
            height={48}
            className="h-12 w-36"
          />
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
              {/* Search Button */}
              <Link
                href="/search"
                className="btn btn-ghost text-foreground cursor-pointer"
                title="搜尋"
                aria-label="搜尋"
              >
                <Search className="h-5 w-5" strokeWidth={1.75} />
              </Link>

              {/* Notification Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  className="btn btn-ghost relative text-foreground cursor-pointer"
                  onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                  title={pendingInvites > 0 ? `${pendingInvites} 個通知` : "通知"}
                  aria-label="通知"
                >
                  <Bell className="h-5 w-5" strokeWidth={1.75} />
                  {pendingInvites > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
                      {pendingInvites > 9 ? "9+" : pendingInvites}
                    </span>
                  ) : null}
                </button>

                <NotificationDropdown isOpen={showNotificationMenu} onClose={() => setShowNotificationMenu(false)} />
              </div>

              {/* Username and Avatar Menu */}
              <div className="relative flex items-center gap-2" ref={userMenuRef}>
                <span
                  className="hidden max-w-[9rem] truncate text-xs font-medium text-muted-foreground lg:inline"
                  title={user.displayName}
                >
                  {user.displayName}
                </span>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="btn btn-ghost p-1 text-foreground cursor-pointer"
                  aria-label="用戶選單"
                >
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-neutral-200">
                    <Image
                      src={user.avatarUrl || "/default-avatar.svg"}
                      alt={user.displayName}
                      fill
                      className="object-cover"
                    />
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-white border border-border shadow-lg z-50">
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-neutral-100 rounded-t-lg border-b border-border"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <UserCircle className="h-4 w-4" strokeWidth={2} />
                      個人檔案
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-neutral-100 border-b border-border"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" strokeWidth={2} />
                      設定
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={2} />
                      登出
                    </button>
                  </div>
                )}
              </div>
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
