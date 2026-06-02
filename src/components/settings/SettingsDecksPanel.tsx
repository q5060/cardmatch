"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit2, GripVertical } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export interface SettingsDeck {
  id: string;
  name: string;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  cardCount: number;
}

type SettingsDecksPanelProps = {
  decks: SettingsDeck[];
  onDecksChange: (decks: SettingsDeck[]) => void;
  decksLoading: boolean;
  onDelete: (deckId: string) => void;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
};

export function SettingsDecksPanel({
  decks,
  onDecksChange,
  decksLoading,
  onDelete,
  onMessage,
}: SettingsDecksPanelProps) {
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedDecks, setOrderedDecks] = useState<SettingsDeck[]>(decks);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const moveDeck = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setOrderedDecks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleReorderToggle = async () => {
    if (!reorderMode) {
      setOrderedDecks(decks);
      setReorderMode(true);
      return;
    }

    setSavingOrder(true);
    try {
      const res = await fetch("/api/decks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckIds: orderedDecks.map((d) => d.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "儲存排序失敗");
      }
      onDecksChange(orderedDecks);
      setReorderMode(false);
      onMessage({ type: "success", text: "牌組排序已儲存" });
    } catch (error: unknown) {
      onMessage({
        type: "error",
        text: error instanceof Error ? error.message : "儲存排序失敗",
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const displayDecks = reorderMode ? orderedDecks : decks;
  const busy = decksLoading || savingOrder;

  return (
    <div className="card space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">管理牌組</h2>
        <div className="flex flex-wrap items-center gap-2">
          {decks.length > 1 ? (
            <button
              type="button"
              onClick={handleReorderToggle}
              disabled={busy}
              className="btn btn-outline btn-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reorderMode ? "儲存排序" : "更改排序"}
            </button>
          ) : null}
          {!reorderMode ? (
            <Link href="/decks/new" className="btn btn-primary btn-sm">
              <Plus className="h-4 w-4" aria-hidden />
              新增牌組
            </Link>
          ) : null}
        </div>
      </div>

      {decks.length === 0 ? (
        <EmptyState title="您還沒有建立任何牌組" description="點擊上方按鈕新增第一個牌組" />
      ) : (
        <ul className="space-y-3">
          {displayDecks.map((deck, index) => (
            <li
              key={deck.id}
              draggable={reorderMode && !busy}
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(e) => {
                if (!reorderMode) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (!reorderMode || draggedIndex === null) return;
                e.preventDefault();
                moveDeck(draggedIndex, index);
                setDraggedIndex(null);
              }}
              className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-black/[0.02] p-4 ${
                reorderMode ? "cursor-grab active:cursor-grabbing" : ""
              } ${draggedIndex === index ? "opacity-60" : ""}`}
            >
              {reorderMode ? (
                <button
                  type="button"
                  className="btn btn-ghost shrink-0 cursor-grab p-2 text-muted-foreground active:cursor-grabbing"
                  aria-label="拖曳排序"
                  tabIndex={-1}
                >
                  <GripVertical className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground">{deck.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {deck.cardCount} 張牌卡 · {deck.visibility}
                </p>
              </div>
              {!reorderMode ? (
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/decks/${deck.id}/edit`}
                    className="btn btn-ghost p-2"
                    aria-label="編輯"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(deck.id)}
                    disabled={decksLoading}
                    className="btn btn-ghost p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="刪除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
