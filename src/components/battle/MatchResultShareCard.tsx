import Image from "next/image";
import { Calendar, MapPin, Trophy, UserRound } from "lucide-react";
import type { MatchSharePayload, MatchSharePlayer } from "@/lib/matchShare";
import {
  formatMatchShareDate,
  getWinnerLabelForViewer,
} from "@/lib/matchShare";
import { MatchResultDeckBlock } from "@/components/battle/MatchResultDeckBlock";

type Props = {
  share: MatchSharePayload;
  viewerId?: number | null;
};

function PlayerColumn({
  player,
  isWinner,
  isDraw,
}: {
  player: MatchSharePlayer;
  isWinner: boolean;
  isDraw: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-3 rounded-2xl border p-4 sm:p-5 ${
        isWinner
          ? "border-primary/40 bg-primary/[0.08] shadow-sm shadow-primary/10"
          : "border-black/[0.06] bg-neutral-50/80"
      }`}
    >
      <div className="relative">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white bg-neutral-100 shadow-md sm:h-24 sm:w-24">
          {player.avatarUrl ? (
            <Image
              src={player.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UserRound className="h-10 w-10" strokeWidth={1.25} />
            </span>
          )}
        </div>
        {isWinner ? (
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="w-full text-center">
        <p className="text-base font-bold text-foreground sm:text-lg">{player.displayName}</p>
        {isDraw ? (
          <p className="mt-1 text-xs text-muted-foreground">平手</p>
        ) : isWinner ? (
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">勝方</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">敗方</p>
        )}
      </div>
    </div>
  );
}

export function MatchResultShareCard({ share, viewerId }: Props) {
  const isDraw = share.winnerId === null;
  const aWins = share.winnerId === share.playerA.id;
  const bWins = share.winnerId === share.playerB.id;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-b from-white to-neutral-50/90 shadow-inner">
      <div className="border-b border-black/[0.06] bg-primary/[0.06] px-5 py-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          CardMatch
        </p>
        <p className="mt-1 text-lg font-bold text-foreground sm:text-xl">對戰結果</p>
        <p className="mt-2 text-sm font-semibold text-primary">
          {getWinnerLabelForViewer(share, viewerId)}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:p-6">
        <PlayerColumn player={share.playerA} isWinner={aWins} isDraw={isDraw} />
        <div className="flex shrink-0 items-center justify-center">
          <span className="rounded-full bg-neutral-200/80 px-3 py-1 text-sm font-bold text-muted-foreground">
            VS
          </span>
        </div>
        <PlayerColumn player={share.playerB} isWinner={bWins} isDraw={isDraw} />
      </div>

      {isDraw ? (
        <p className="px-6 pb-2 text-center text-sm font-medium text-muted-foreground">
          本場為平手
        </p>
      ) : null}

      <div className="grid gap-3 border-t border-black/[0.06] px-5 py-4 sm:grid-cols-2 sm:px-6">
        <MatchResultDeckBlock deck={share.playerA.deck} playerLabel={share.playerA.displayName} />
        <MatchResultDeckBlock deck={share.playerB.deck} playerLabel={share.playerB.displayName} />
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-black/[0.06] px-5 py-4 text-center text-sm text-muted-foreground sm:px-6">
        <p className="flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
          <span className="font-medium text-foreground">{share.meetLabel}</span>
        </p>
        <p className="flex items-center justify-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
          <span>{formatMatchShareDate(share.completedAt)}</span>
        </p>
      </div>
    </div>
  );
}
