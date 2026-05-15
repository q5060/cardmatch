"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bell } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: string;
  senderId: number | null;
  referenceId: string | null;
  data: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
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
      }
    } catch (error) {
      console.error("標記全部已讀失敗:", error);
    } finally {
      setMarking(false);
    }
  };

  const getNotificationMessage = (notification: NotificationItem) => {
    switch (notification.type) {
      case "MATCH_CREATED":
        return "對戰邀請";
      case "MATCH_COMPLETED":
        return "對戰已成立";
      case "BATTLE_RESULT":
        return "對戰結果待確認";
      case "FRIEND_REQUEST":
        return "收到好友邀請";
      case "MESSAGE":
        return "收到新訊息";
      default:
        return "新通知";
    }
  };

  const getNotificationLink = (notification: NotificationItem) => {
    switch (notification.type) {
      case "MATCH_CREATED":
      case "MATCH_COMPLETED":
      case "BATTLE_RESULT":
        return `/battle`;
      case "FRIEND_REQUEST":
        return `/friends`;
      case "MESSAGE":
        return notification.referenceId ? `/chat/${notification.referenceId}` : `/friends`;
      default:
        return "/notifications";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-border bg-background shadow-lg">
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
            {notifications.map((notification) => (
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
                  } catch (error) {
                    console.error("Failed to mark notification as read:", error);
                  }
                }}
                className="block px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {getNotificationMessage(notification)}
                    </p>
                    {notification.data && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.data}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString("zh-Hant", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
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
