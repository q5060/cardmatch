"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { DeckSummaryWithAccess } from "@/lib/matchDeck";
import type { DeckCardRow } from "@/lib/matchDeck";
import { DeckCardStrip } from "@/components/battle/DeckCardStrip";
import { DeckVisibilityBadge } from "@/components/battle/DeckVisibilityBadge";

type Props = {
  deck: DeckSummaryWithAccess;
  spotId?: string;
  matchId?: number;
  label?: string;
};

export function DisclosedDeckViewer({
  deck,
  spotId,
  matchId,
  label = "使用牌組",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cards, setCards] = useState<DeckCardRow[] | null>(null);

  const canExpand = deck.canViewCards;
  const isBattleDisclosure = spotId != null || matchId != null;

  const fetchCards = useCallback(async () => {
    if (cards !== null) return;
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ deckId: deck.id });
      if (spotId) params.set("spotId", spotId);
      else if (matchId != null) params.set("matchId", String(matchId));
      const res = await fetch(`/api/battle/deck-preview?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "無法載入牌組",
        );
      }
      const data = (await res.json()) as { cards: DeckCardRow[] };
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "無法載入牌組");
    } finally {
      setLoading(false);
    }
  }, [cards, deck.id, matchId, spotId]);

  const toggle = () => {
    if (!canExpand) return;
    const next = !open;
    setOpen(next);
    if (next) void fetchCards();
  };

  if (!canExpand) {
    return (
      <div className="rounded-xl border border-border bg-black/[0.02] p-3 text-sm">
        <span className="text-muted-foreground">{label}：</span>
        <span className="font-medium text-foreground">{deck.title}</span>
        {!isBattleDisclosure ? (
          <span className="ml-2 inline-block align-middle">
            <DeckVisibilityBadge visibility={deck.visibility} />
          </span>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">牌組內容未公開</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-black/[0.02] p-3">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left text-sm"
        aria-expanded={open}
      >
        <span>
          <span className="text-muted-foreground">{label}：</span>
          <span className="font-medium text-primary underline-offset-2 hover:underline">
            {deck.title}
          </span>
          {!isBattleDisclosure ? (
            <span className="ml-2 inline-block align-middle">
              <DeckVisibilityBadge visibility={deck.visibility} />
            </span>
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>
      {/* <p className="mt-1 text-xs text-muted-foreground">
        {open ? "點擊收合" : "點擊查看卡牌"}
      </p> */}

      {open ? (
        <div className="mt-3 border-t border-border pt-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">載入卡牌中…</p>
          ) : null}
          {err ? (
            <p className="text-xs text-red-700" role="alert">
              {err}
            </p>
          ) : null}
          {!loading && !err && cards !== null ? (
            cards.length > 0 ? (
              <DeckCardStrip title="" cards={cards} />
            ) : (
              <p className="text-xs text-muted-foreground">此牌組沒有卡牌資料</p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
