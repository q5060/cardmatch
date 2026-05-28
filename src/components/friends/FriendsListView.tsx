"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, SortAsc, Clock } from "lucide-react";
import { UserCircle } from "lucide-react";

interface Friend {
  userId: number;  // 用户的实际 ID (流水号)
  friendshipId: string;  // friendship ID (用于聊天链接)
  displayName: string;
  avatarUrl?: string | null;
  lastMessageAt?: string | Date | null;
}

interface FriendsListViewProps {
  friends: Friend[];
}

type SortType = "recent" | "name";

export function FriendsListView({ friends }: FriendsListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("recent");

  const filtered = useMemo(() => {
    let result = friends;

    // 搜尋
    if (searchQuery) {
      result = result.filter((f) =>
        f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 排序
    if (sortType === "name") {
      result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else {
      // 最近聊天
      result.sort((a, b) => {
        const aTime = a.lastMessageAt
          ? new Date(a.lastMessageAt).getTime()
          : 0;
        const bTime = b.lastMessageAt
          ? new Date(b.lastMessageAt).getTime()
          : 0;
        return bTime - aTime;
      });
    }

    return result;
  }, [friends, searchQuery, sortType]);

  return (
    <div className="space-y-6">
      {/* 搜尋和排序控制 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜尋好友名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortType("recent")}
            className={`btn btn-sm ${
              sortType === "recent" ? "btn-secondary border-primary/30 text-primary" : "btn-ghost"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">最近聊天</span>
          </button>
          <button
            onClick={() => setSortType("name")}
            className={`btn btn-sm ${
              sortType === "name" ? "btn-secondary border-primary/30 text-primary" : "btn-ghost"
            }`}
          >
            <SortAsc className="h-4 w-4" />
            <span className="hidden sm:inline">名稱</span>
          </button>
        </div>
      </div>

      {/* 好友卡片列表 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-12">
          <UserCircle className="h-10 w-10 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            {friends.length === 0 ? "尚無好友" : "找不到符合的好友"}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((friend) => (
            <li
              key={friend.friendshipId}
              className="card card-hover flex flex-col items-center gap-4 p-6 transition-all h-full"
            >
              {/* 頭像 */}
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100">
                {friend.avatarUrl ? (
                  <Image
                    src={friend.avatarUrl}
                    alt={friend.displayName}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserCircle className="h-12 w-12 text-muted-foreground opacity-50" />
                  </div>
                )}
              </div>

              {/* 名字 */}
              <div className="text-center flex-1 flex flex-col items-center justify-center">
                <h3 className="font-semibold text-base text-foreground">
                  {friend.displayName}
                </h3>
              </div>

              {/* 按鈕 */}
              <div className="w-full flex gap-2">
                <Link
                  href={`/profile/${friend.userId}`}
                  className="flex-1 btn btn-outline btn-sm"
                >
                  檔案
                </Link>
                <Link
                  href={`/chat/${friend.friendshipId}`}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  聊天
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
