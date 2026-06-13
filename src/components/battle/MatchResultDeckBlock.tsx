"use client";

import type { DeckSummaryWithCards } from "@/lib/matchDeck";
import { DeckCardStrip } from "@/components/battle/DeckCardStrip";
import { formatDeckLabel } from "@/components/battle/MatchDeckSummaryLine";

type Props = {
  deck: DeckSummaryWithCards | null;
  playerLabel: string;
};

export function MatchResultDeckBlock({ deck, playerLabel }: Props) {
  if (!deck) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        {playerLabel}：未選擇牌組
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-black/[0.06] bg-white/60 p-3">
      <p className="text-center text-xs text-muted-foreground">
        {playerLabel}牌組
      </p>
      <p className="text-center text-sm font-semibold text-foreground">
        {formatDeckLabel(deck)}
      </p>
      {deck.canViewCards && deck.cards && deck.cards.length > 0 ? (
        <DeckCardStrip title="" cards={deck.cards} />
      ) : deck.canViewCards ? (
        <p className="text-center text-xs text-muted-foreground">牌組沒有卡牌資料</p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">牌組內容未公開</p>
      )}
    </div>
  );
}
