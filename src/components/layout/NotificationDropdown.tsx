"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import {
  getNotificationBody,
  getNotificationTitle,
} from "@/lib/notificationDisplay";

interface NotificationItem {
  id: string;
  type: string;
  senderId: number | null;
  referenceId: string | null;
  data: string | Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?unreadOnly=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        if (typeof data.unreadCount === "number") {
          onUnreadCountChange?.(data.unreadCount);
        }
      }
    } catch (error) {
      console.error("獲取通知失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    setMarking(true);
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setNotifications([]);
        onUnreadCountChange?.(0);
      }
    } catch (error) {
      console.error("標記全部已讀失敗:", error);
    } finally {
      setMarking(false);
    }
  };

  const getNotificationLink = (notification: NotificationItem) => {
    switch (notification.type) {
      case "SPOT_INVITE":
      case "RANDOM_MATCH":
      case "MATCH_CREATED":
      case "MATCH_COMPLETED":
      case "BATTLE_RESULT":
        return `/battle`;
      case "FRIEND_REQUEST":
        return `/friends`;
      case "MESSAGE":
        return notification.senderId ? `/chat/${notification.senderId}` : `/friends`;
      default:
        return "/notifications";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="menu-panel absolute right-0 top-full z-50 mt-2 w-80">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold text-sm">未讀通知</h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">沒有新通知</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const title = getNotificationTitle(notification.type, notification.data);
              const body = getNotificationBody(notification.type, notification.data);
              const isSpotInvite =
                notification.type === "SPOT_INVITE" || notification.type === "RANDOM_MATCH";
              return (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={async (e) => {
                    onClose();
                    // Mark as read
                    try {
                      await fetch("/api/notifications", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ notificationId: notification.id }),
                      });
                      const next = notifications.filter((n) => n.id !== notification.id);
                      setNotifications(next);
                      onUnreadCountChange?.(next.length);
                    } catch (error) {
                      console.error("Failed to mark notification as read:", error);
                    }
                  }}
                  className={`block px-4 py-3 transition-colors ${isSpotInvite
                      ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary"
                      : "hover:bg-accent/50"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      <div
                        className={`mt-1.5 h-2 w-2 rounded-full ${isSpotInvite ? "animate-pulse bg-primary" : "bg-primary"
                          }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isSpotInvite ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">
                          {notification.type === "RANDOM_MATCH" ? "配對成功" : "約戰邀請"}
                        </p>
                      ) : null}
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      {body ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {body}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString("zh-Hant", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2 flex items-center justify-between gap-2">
        {notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={marking}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            全部標示為已讀
          </button>
        )}
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-primary hover:underline"
        >
          檢視所有通知
        </Link>
      </div>
    </div>
  );
}
