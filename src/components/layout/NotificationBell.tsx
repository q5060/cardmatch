"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import {
  useRealtimeConnected,
  useRealtimeEvent,
} from "@/hooks/useRealtimeEvent";
import type { RealtimeEvent } from "@/lib/realtime/types";

type Props = {
  initialUnreadCount: number;
  className?: string;
  onCountChange?: (count: number) => void;
};

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications?unreadOnly=true");
  if (!res.ok) return 0;
  const data = (await res.json()) as { unreadCount?: number };
  return data.unreadCount ?? 0;
}

export function NotificationBell({
  initialUnreadCount,
  className = "",
  onCountChange,
}: Props) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sseConnected = useRealtimeConnected();

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    onCountChange?.(unreadCount);
  }, [unreadCount, onCountChange]);

  const refreshCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const count = await fetchUnreadCount();
    setUnreadCount(count);
  }, []);

  const onNotification = useCallback((e: RealtimeEvent) => {
    if (e.type !== "notification.new") return;
    setUnreadCount(e.unreadCount);
  }, []);

  useRealtimeEvent((e) => e.type === "notification.new", onNotification);

  useEffect(() => {
    if (sseConnected) return;
    const id = window.setInterval(() => void refreshCount(), 60_000);
    return () => window.clearInterval(id);
  }, [refreshCount, sseConnected]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") void refreshCount();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        className="btn btn-ghost relative text-foreground cursor-pointer"
        onClick={() => setIsOpen((o) => !o)}
        title={unreadCount > 0 ? `${unreadCount} 個通知` : "通知"}
        aria-label="通知"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </div>
  );
}
