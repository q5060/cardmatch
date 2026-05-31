"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { DECK_VISIBILITY } from "@/lib/constants";

type Deck = {
  id: string;
  title: string;
  notes: string;
  visibility: string;
  deckJson: string | null;
};

type DeckCard = {
  id: number;
  name: string;
  imageUrl?: string | null;
  count: number;
  category?: string;
};

function getVisibilityLabel(visibility: string): string {
  switch (visibility) {
    case DECK_VISIBILITY.PRIVATE:
      return "私人";
    case DECK_VISIBILITY.FRIENDS:
      return "限好友";
    case DECK_VISIBILITY.PUBLIC:
    default:
      return "公開";
  }
}

export function PublicDeckList({
  decks,
  viewedUserId,
  viewerId,
}: {
  decks: Deck[];
  viewedUserId?: number;
  viewerId?: number;
}) {
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);
  const [deckCards, setDeckCards] = useState<Record<string, DeckCard[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const isOwnProfile = viewedUserId === viewerId;

  const handleExpandDeck = async (deck: Deck) => {
    if (expandedDeckId === deck.id) {
      setExpandedDeckId(null);
      return;
    }

    if (deckCards[deck.id]) {
      setExpandedDeckId(deck.id);
      return;
    }

    setLoading((prev) => ({ ...prev, [deck.id]: true }));
    try {
      // For public viewing, use viewOnly parameter
      const url = isOwnProfile ? `/api/decks/${deck.id}` : `/api/decks/${deck.id}?viewOnly=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.deckJson) {
          try {
            const cards = JSON.parse(data.deckJson);
            setDeckCards((prev) => ({
              ...prev,
              [deck.id]: Array.isArray(cards) ? cards : [],
            }));
          } catch (e) {
            console.error("Failed to parse deckJson:", e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch deck details:", err);
    } finally {
      setLoading((prev) => ({ ...prev, [deck.id]: false }));
    }

    setExpandedDeckId(deck.id);
  };

  if (decks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {isOwnProfile ? "尚未建立任何牌組。" : "尚無公開牌組。"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {decks.map((d) => {
        const isExpanded = expandedDeckId === d.id;
        const cards = deckCards[d.id] || [];
        const isLoading = loading[d.id];

        return (
          <div
            key={d.id}
            className="card card-hover overflow-hidden transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={isOwnProfile ? `/decks/${d.id}/edit` : "#"}
                  onClick={(e) => {
                    if (!isOwnProfile) {
                      e.preventDefault();
                      handleExpandDeck(d);
                    }
                  }}
                  className="font-medium text-foreground hover:text-primary transition-colors block"
                >
                  {d.title}
                </Link>
                {d.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">{d.notes}</p>
                ) : null}
                <span className="mt-2 inline-block text-xs text-muted-foreground">
                  {getVisibilityLabel(d.visibility)}
                </span>

                {/* Card preview - show first few cards */}
                {cards.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cards.slice(0, 4).map((card, idx) => (
                      <div key={idx} className="relative group">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="h-24 w-16 rounded object-cover border border-neutral-200 hover:border-primary/50"
                            title={`${card.name} x${card.count}`}
                          />
                        ) : (
                          <div className="h-24 w-16 rounded border border-neutral-200 bg-neutral-100 flex items-center justify-center text-xs text-center px-1">
                            <span className="text-muted-foreground truncate">
                              {card.name}
                            </span>
                          </div>
                        )}
                        {card.count > 1 && (
                          <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {card.count}
                          </span>
                        )}
                      </div>
                    ))}
                    {cards.length > 4 && (
                      <div className="h-24 w-16 rounded border border-dashed border-neutral-300 flex items-center justify-center text-xs text-muted-foreground font-medium bg-neutral-50/50">
                        +{cards.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expand button */}
              <button
                onClick={() => handleExpandDeck(d)}
                disabled={isLoading}
                className="p-2 hover:bg-neutral-100 rounded transition-colors shrink-0"
                title={isExpanded ? "折疊牌組" : "展開牌組"}
              >
                <ChevronRight
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>
            </div>

            {/* Expanded view */}
            {isExpanded && (
              <div className="border-t border-neutral-200 bg-neutral-50/50 p-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">載入中...</p>
                ) : cards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚未加入卡片
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {cards.map((card, idx) => (
                      <div key={idx} className="relative group">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full rounded object-cover border border-neutral-200 hover:border-primary/50 hover:shadow-md transition"
                            title={`${card.name} x${card.count}`}
                          />
                        ) : (
                          <div className="w-full aspect-video rounded border border-neutral-200 bg-neutral-100 flex items-center justify-center text-xs text-center px-1">
                            <span className="text-muted-foreground truncate">
                              {card.name}
                            </span>
                          </div>
                        )}
                        {card.count > 1 && (
                          <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {card.count}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  {isOwnProfile && (
                    <>
                      <Link
                        href={`/decks/${d.id}/edit`}
                        className="btn btn-outline btn-sm"
                      >
                        編輯
                      </Link>
                      <Link
                        href={`/decks/${d.id}/setting`}
                        className="btn btn-outline btn-sm"
                      >
                        設定
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
