"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, UserPlus, MessageSquare } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "FRIEND_REQUEST" | "UNREAD_MESSAGE" | "MATCH_COMPLETED" | "MESSAGE";
  title: string;
  message: string;
  user: {
    id: string;
    displayName: string;
    avatar: string | null;
  } | null;
  timestamp: string;
  actionId: string | null;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("獲取通知失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequestAction = async (friendshipId: string, action: "ACCEPT" | "REJECT") => {
    try {
      const res = await fetch(`/api/friendships/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setNotifications(notifications.filter((n) => n.actionId !== friendshipId));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("處理好友請求失敗:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-border bg-background shadow-lg">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold text-sm">通知</h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">沒有新通知</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    {notification.type === "FRIEND_REQUEST" ? (
                      <UserPlus className="h-5 w-5 text-blue-500" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-green-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>

                    {notification.type === "FRIEND_REQUEST" && notification.actionId ? (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() =>
                            handleFriendRequestAction(
                              notification.actionId!,
                              "ACCEPT"
                            )
                          }
                          className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          接受
                        </button>
                        <button
                          onClick={() =>
                            handleFriendRequestAction(
                              notification.actionId!,
                              "REJECT"
                            )
                          }
                          className="flex-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
                        >
                          拒絕
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <Link
            href="/friends"
            onClick={onClose}
            className="text-xs text-primary hover:underline"
          >
            檢視所有通知
          </Link>
        </div>
      )}
    </div>
  );
}
