"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { prefersReducedMotion } from "@/lib/motion";
import {
  Bell,
  Home,
  LogOut,
  Search,
  Swords,
  UserCircle,
  Users,
  Settings,
  Menu,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const links: {
  href: string;
  label: string;
  auth?: boolean;
  Icon: typeof Home;
}[] = [
  { href: "/", label: "首頁", Icon: Home },
  { href: "/battle", label: "對戰", Icon: Swords },
  { href: "/friends", label: "好友", Icon: Users, auth: true },
  { href: "/profile", label: "我的檔案", Icon: UserCircle, auth: true },
  { href: "/search", label: "搜尋", Icon: Search, auth: true },
];

/** `/profile` must not match `/profile/[userId]` for active state. */
function isNavLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/profile") return pathname === "/profile";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeReducedMotion(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type Props = {
  user?: { id: number; displayName: string; avatarUrl: string | null } | null;
  pendingInvites?: number;
};

export function NavBar({ user, pendingInvites = 0 }: Props) {
  const pathname = usePathname();
  const [notificationUnread, setNotificationUnread] = useState<number | null>(
    null,
  );
  const unreadCount = notificationUnread ?? pendingInvites;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );

  const visibleLinks = useMemo(
    () => links.filter(({ auth }) => !auth || user),
    [user],
  );

  useLayoutEffect(() => {
    const active = visibleLinks.find(({ href }) => isNavLinkActive(href, pathname));
    if (!active || !desktopNavRef.current) {
      setPill(null);
      return;
    }
    const el = linkRefs.current.get(active.href);
    if (!el) {
      setPill(null);
      return;
    }
    const navRect = desktopNavRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPill({
      left: elRect.left - navRect.left,
      width: elRect.width,
    });
  }, [pathname, visibleLinks]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    }

    if (showUserMenu || showMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu, showMobileMenu]);

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

        <nav
          ref={desktopNavRef}
          className="relative hidden flex-1 items-center justify-center gap-1 md:flex"
        >
          {pill ? (
            <span
              aria-hidden
              className={`pointer-events-none absolute top-1/2 h-9 -translate-y-1/2 rounded-full bg-primary/12 ${
                reducedMotion ? "" : "transition-[left,width] duration-250 ease-out"
              }`}
              style={{ left: pill.left, width: pill.width }}
            />
          ) : null}
          {visibleLinks.map(({ href, label, Icon }) => {
            const active = isNavLinkActive(href, pathname);
            const isSearch = href === "/search";
            return (
              <span key={href} className={`contents ${isSearch ? "ml-2" : ""}`}>
                {isSearch && (
                  <span className="mx-1 h-5 w-px shrink-0 bg-border/70" aria-hidden />
                )}
                <Link
                  ref={(el) => {
                    if (el) linkRefs.current.set(href, el);
                    else linkRefs.current.delete(href);
                  }}
                  href={href}
                  aria-label={isSearch ? label : undefined}
                  className={`relative z-[1] flex items-center gap-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
                    isSearch ? "px-2.5 py-2" : "px-4 py-2 text-sm font-medium"
                  } ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                  {!isSearch && label}
                </Link>
              </span>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <NotificationBell
                initialUnreadCount={pendingInvites}
                onCountChange={setNotificationUnread}
                className="hidden md:block"
              />

              {/* Desktop: Username and Avatar Menu */}
              <div className="relative hidden md:flex items-center gap-2" ref={userMenuRef}>
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
                  <div className="menu-panel motion-menu-in absolute right-0 top-full z-50 mt-2 w-48">
                    <Link
                      href="/profile"
                      className="menu-panel-item rounded-t-[1.25rem] border-b border-border"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <UserCircle className="h-4 w-4" strokeWidth={2} />
                      我的檔案
                    </Link>
                    <Link
                      href="/settings"
                      className="menu-panel-item border-b border-border"
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
                      className="menu-panel-item w-full rounded-b-[1.25rem] text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={2} />
                      登出
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile: Only the dropdown menu button */}
              <div className="relative md:hidden" ref={mobileMenuRef}>
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="btn btn-ghost text-foreground cursor-pointer relative"
                  title="菜單"
                  aria-label="菜單"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                  )}
                </button>


                {showMobileMenu && (
                  <div className="menu-panel motion-menu-in absolute right-0 top-full z-50 mt-2 w-56">
                    {/* Nav Items */}
                    {links.map(({ href, label, auth, Icon }) => {
                      if (auth && !user) return null;
                      const active = isNavLinkActive(href, pathname);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`menu-panel-item border-b border-border font-medium last:border-b-0 ${
                            active ? "bg-primary/12 text-primary" : ""
                          }`}
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                          {label}
                        </Link>
                      );
                    })}

                    {user && (
                      <>
                        {/* Notification Badge with Link */}
                        <Link
                          href="/notifications"
                          className="menu-panel-item justify-between border-b border-border"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <div className="flex items-center gap-3">
                            <Bell className="h-4 w-4" strokeWidth={1.75} />
                            <span className="text-sm font-medium">通知</span>
                          </div>
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </Link>

                        {/* Settings */}
                        <Link
                          href="/settings"
                          className="menu-panel-item border-b border-border"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <Settings className="h-4 w-4" strokeWidth={2} />
                          設定
                        </Link>

                        {/* Logout */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMobileMenu(false);
                            logout();
                          }}
                          className="menu-panel-item w-full text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" strokeWidth={2} />
                          登出
                        </button>
                      </>
                    )}
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
