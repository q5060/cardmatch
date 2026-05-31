"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { TopOpponent } from "@/lib/queries";

export function TopOpponentsPanel({
  opponents,
}: {
  opponents: TopOpponent[];
}) {
  if (opponents.length === 0) {
    return null;
  }

  return (
    <div className="card card-hover p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" strokeWidth={1.75} />
        <h3 className="text-lg font-semibold text-foreground">對手統計</h3>
      </div>
      
      <div className="space-y-2">
        {opponents.map((opponent) => (
          <div
            key={opponent.opponentId}
            className="flex items-center justify-between p-3 rounded-lg border border-neutral-200/50 hover:border-primary/30 hover:bg-primary/5 transition"
          >
            <Link
              href={`/profile/${opponent.opponentId}`}
              className="flex-1 min-w-0 group"
            >
              <div className="text-sm font-medium text-foreground group-hover:text-primary transition truncate">
                {opponent.displayName}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                共對戰 {opponent.total} 場
              </div>
            </Link>

            <div className="flex items-center gap-2 ml-3 shrink-0">
              <div className="flex gap-1.5 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-green-600">
                    {opponent.wins}
                  </span>
                  <span className="text-[10px] text-muted-foreground">勝</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-red-600">
                    {opponent.losses}
                  </span>
                  <span className="text-[10px] text-muted-foreground">敗</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {opponent.draws}
                  </span>
                  <span className="text-[10px] text-muted-foreground">平</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
