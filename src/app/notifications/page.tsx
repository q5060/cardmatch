import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import {
  getNotificationBody,
  getNotificationTitle,
} from "@/lib/notificationDisplay";

export const metadata = {
  title: "通知 | CardMatch",
  description: "查看所有通知",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch all notifications (both read and unread)
  const notifications = await prisma.notification.findMany({
    where: { userId: parseInt(String(user.id)) },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true },
      },
    },
    take: 100,
  });

  const getNotificationLink = (notification: typeof notifications[0]) => {
    switch (notification.type) {
      case "SPOT_INVITE":
      case "MATCH_CREATED":
      case "MATCH_COMPLETED":
      case "BATTLE_RESULT":
        return `/battle`;
      case "FRIEND_REQUEST":
        return `/friends`;
      case "MESSAGE":
        return `/friends`;
      default:
        return "#";
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">通知</h1>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 py-16">
            <Bell className="h-12 w-12 text-muted-foreground opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">沒有通知</p>
              <p className="text-xs text-muted-foreground mt-1">
                當您有新活動時，通知會出現在這裡
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => {
              const title = getNotificationTitle(notification.type, notification.data);
              const body = getNotificationBody(notification.type, notification.data);
              const isSpotInvite =
                notification.type === "SPOT_INVITE" && !notification.read;
              return (
              <li key={notification.id}>
                <Link
                  href={getNotificationLink(notification)}
                  className={`block card card-hover p-4 transition-colors ${
                    isSpotInvite
                      ? "border-2 border-primary/40 bg-primary/10 hover:bg-primary/15"
                      : notification.read
                        ? "bg-white hover:bg-neutral-50"
                        : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      {isSpotInvite ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">
                          約戰公告 · 新邀請
                        </p>
                      ) : null}
                      <p className="font-medium text-foreground">{title}</p>
                      {body ? (
                        <p className="text-sm text-muted-foreground mt-1">{body}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.createdAt).toLocaleString(
                          "zh-Hant",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="ml-3 h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
