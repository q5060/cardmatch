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

export function FriendsListView({ friends, onSelectFriend, onDeleteFriend }: FriendsListViewProps) {
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
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((friend) => (
            <li
              key={friend.id}
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
              <div className="w-full flex gap-2 relative z-10">
                <Link
                  href={`/profile/${friend.id}`}
                  className="flex-1 btn btn-outline btn-sm"
                >
                  檔案
                </Link>
                <button
                  onClick={() => onSelectFriend?.(friend.id)}
                  className="flex-1 btn btn-primary btn-sm"
                >
                  聊天
                </button>
              </div>
              
              {/* 名字和頭像也可點擊進入個人檔案 */}
              <Link
                href={`/profile/${friend.id}`}
                className="absolute inset-0 rounded-lg"
                aria-hidden
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
