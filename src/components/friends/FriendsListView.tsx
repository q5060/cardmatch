"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, SortAsc, Clock } from "lucide-react";
import { UserCircle } from "lucide-react";

interface Friend {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  lastMessageAt?: string | Date | null;
}

interface FriendsListViewProps {
  friends: Friend[];
  onSelectFriend?: (friendId: string) => void;
}

type SortType = "recent" | "name";

export function FriendsListView({ friends, onSelectFriend }: FriendsListViewProps) {
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
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortType("recent")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              sortType === "recent"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border hover:bg-muted"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">最近聊天</span>
          </button>
          <button
            onClick={() => setSortType("name")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              sortType === "name"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border hover:bg-muted"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((friend) => (
            <div
              key={friend.id}
              onClick={() => onSelectFriend?.(friend.id)}
              className="card card-hover group cursor-pointer overflow-hidden transition-all"
            >
              <div className="relative aspect-square bg-gradient-to-br from-primary/10 to-teal-100/20">
                {friend.avatarUrl ? (
                  <Image
                    src={friend.avatarUrl}
                    alt={friend.displayName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserCircle className="h-16 w-16 text-muted-foreground opacity-30" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
                  {friend.displayName}
                </h3>
                {friend.lastMessageAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    最後聊天：
                    {new Date(friend.lastMessageAt).toLocaleDateString("zh-TW")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
