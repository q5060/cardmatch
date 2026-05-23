import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  getNotificationBody,
  getNotificationTitle,
} from "@/lib/notificationDisplay";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "通知 | CardMatch",
  description: "查看所有通知",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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

  const getNotificationLink = (notification: (typeof notifications)[0]) => {
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
        return "#";
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <BackLink href="/" />
        <PageHeader
          className="flex-1"
          title="通知"
        />
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="沒有通知"
          description="當您有新活動時，通知會出現在這裡"
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const title = getNotificationTitle(notification.type, notification.data);
            const body = getNotificationBody(notification.type, notification.data);
            const isPriorityInvite =
              (notification.type === "SPOT_INVITE" || notification.type === "RANDOM_MATCH") &&
              !notification.read;
            const unread = !notification.read;

            let cardClass = "card card-hover block p-4 transition-colors ";
            if (isPriorityInvite) {
              cardClass += "notification-spot-invite";
            } else if (unread) {
              cardClass += "notification-unread";
            }

            return (
              <li key={notification.id}>
                <Link href={getNotificationLink(notification)} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {isPriorityInvite ? (
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {notification.type === "RANDOM_MATCH"
                            ? "隨機配對"
                            : "約戰公告 · 新邀請"}
                        </p>
                      ) : null}
                      <p className="font-medium text-foreground">{title}</p>
                      {body ? (
                        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString("zh-Hant", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    {unread ? (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        aria-label="未讀"
                      />
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
