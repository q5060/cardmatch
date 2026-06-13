"use client";

import type { ActiveMatchDTO } from "@/lib/matchDto";
import { DeckCardStrip } from "@/components/battle/DeckCardStrip";
import { formatDeckLabel } from "@/components/battle/MatchDeckSummaryLine";

type Props = {
  activeMatch: ActiveMatchDTO;
};

export function BattleDeckCardsPanel({ activeMatch }: Props) {
  const myCards = activeMatch.myDeck?.cards;
  const theirCards = activeMatch.theirDeck?.cards;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-black/[0.02] p-4">
      <h3 className="text-sm font-semibold text-foreground">對戰牌組</h3>
      {activeMatch.myDeck && myCards && myCards.length > 0 ? (
        <DeckCardStrip title={`我的牌組 · ${formatDeckLabel(activeMatch.myDeck)}`} cards={myCards} />
      ) : (
        <p className="text-xs text-muted-foreground">
          我的牌組：{formatDeckLabel(activeMatch.myDeck)}
        </p>
      )}
      {activeMatch.theirDeck && theirCards && theirCards.length > 0 ? (
        <DeckCardStrip
          title={`對手牌組 · ${formatDeckLabel(activeMatch.theirDeck)}`}
          cards={theirCards}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          對手牌組：{formatDeckLabel(activeMatch.theirDeck)}
        </p>
      )}
    </div>
  );
}
