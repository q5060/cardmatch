"use client";

import Image from "next/image";
import { Check, UserRound } from "lucide-react";
import type { ActiveMatchDTO } from "@/lib/matchDto";
import { motionClass, prefersReducedMotion } from "@/lib/motion";
import { ageLabel, genderLabel } from "@/lib/profile";

type PlayerInfo = {
  label: string;
  displayName: string;
  avatarUrl: string | null;
  ready: boolean;
  isSelf: boolean;
};

function ReadyAvatar({ player, reducedMotion }: { player: PlayerInfo; reducedMotion: boolean }) {
  const readyRing = player.ready
    ? "ring-2 ring-emerald-500"
    : "ring-2 ring-dashed ring-neutral-300";

  const pulse = player.ready && !reducedMotion ? "animate-pulse" : "";

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className={`relative rounded-full ${readyRing} ${pulse}`}>
        {player.avatarUrl ? (
          <Image
            src={player.avatarUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <UserRound className="h-7 w-7 text-primary" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        {player.ready ? (
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white ${motionClass(!reducedMotion, "motion-check-pop")}`}
            aria-hidden
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">{player.label}</p>
        <p className="max-w-[7rem] truncate text-sm font-semibold text-foreground">
          {player.isSelf ? "你" : player.displayName}
        </p>
        <p
          className={`mt-0.5 text-xs font-medium ${
            player.ready ? "text-emerald-600" : "text-muted-foreground"
          }`}
        >
          {player.ready ? "已準備" : "未準備"}
        </p>
      </div>
    </div>
  );
}

type Props = {
  activeMatch: ActiveMatchDTO;
  userId: number;
  myReady: boolean;
  theirReady: boolean;
  readyButtonClassName?: string;
  children: React.ReactNode;
};

export function BattleReadyStrip({
  activeMatch,
  userId,
  myReady,
  theirReady,
  readyButtonClassName = "",
  children,
}: Props) {
  const iAmA = activeMatch.playerAId === userId;
  const self = iAmA ? activeMatch.playerA : activeMatch.playerB;
  const opponent = iAmA ? activeMatch.playerB : activeMatch.playerA;
  const reducedMotion = prefersReducedMotion();

  const selfPlayer: PlayerInfo = {
    label: "你的狀態",
    displayName: self.displayName,
    avatarUrl: self.avatarUrl ?? null,
    ready: myReady,
    isSelf: true,
  };

  const opponentPlayer: PlayerInfo = {
    label: "對手",
    displayName: opponent.displayName,
    avatarUrl: opponent.avatarUrl ?? null,
    ready: theirReady,
    isSelf: false,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">雙方準備完成後將自動開始對戰</p>
      <div className="flex items-start justify-center gap-4 sm:gap-8">
        <ReadyAvatar player={selfPlayer} reducedMotion={reducedMotion} />
        <div
          className={`flex shrink-0 items-center self-center pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${motionClass(myReady && theirReady && !reducedMotion, "motion-vs-flash")}`}
        >
          VS
        </div>
        <ReadyAvatar player={opponentPlayer} reducedMotion={reducedMotion} />
      </div>
      {(genderLabel(opponent.gender) || ageLabel(opponent.age)) && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            對手識別
          </p>
          <p className="mt-1 text-foreground">
            {[genderLabel(opponent.gender), ageLabel(opponent.age)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}
      <div className={readyButtonClassName}>{children}</div>
    </div>
  );
}
