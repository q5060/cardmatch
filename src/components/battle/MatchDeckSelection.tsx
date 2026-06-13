"use client";

import { useState } from "react";
import type { ActiveMatchDTO } from "@/lib/matchDto";
import { DeckPickerField } from "@/components/battle/DeckPickerField";
import { MatchDeckSummaryLine } from "@/components/battle/MatchDeckSummaryLine";
import { DisclosedDeckViewer } from "@/components/battle/DisclosedDeckViewer";
import { setMatchDeck } from "@/actions/match";

type Props = {
  activeMatch: ActiveMatchDTO;
  myReady: boolean;
  disabled?: boolean;
  onUpdated: () => void;
  onError: (message: string) => void;
};

export function MatchDeckSelection({
  activeMatch,
  myReady,
  disabled,
  onUpdated,
  onError,
}: Props) {
  const [pending, setPending] = useState(false);
  const myDeckId = activeMatch.myDeck?.id ?? null;

  async function handleChange(deckId: string | null) {
    if (myReady) return;
    setPending(true);
    onError("");
    try {
      await setMatchDeck(activeMatch.id.toString(), deckId);
      onUpdated();
    } catch (e) {
      onError(e instanceof Error ? e.message : "變更牌組失敗");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-black/[0.02] p-4">
      <h3 className="text-sm font-semibold text-foreground">牌組選擇</h3>
      <DeckPickerField
        value={myDeckId}
        onChange={(id) => void handleChange(id)}
        disabled={disabled || myReady || pending}
        label="我的牌組"
      />
      {activeMatch.theirDeck ? (
        <DisclosedDeckViewer
          deck={activeMatch.theirDeck}
          matchId={activeMatch.id}
          label="對手牌組"
        />
      ) : (
        <MatchDeckSummaryLine label="對手牌組" deck={null} />
      )}
      {myReady ? (
        <p className="text-xs text-muted-foreground">已準備，取消準備後可變更牌組。</p>
      ) : null}
    </div>
  );
}
