"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  isOwnProfile: forceIsOwnProfile,
}: {
  decks: Deck[];
  viewedUserId?: number;
  viewerId?: number;
  isOwnProfile?: boolean;
}) {
  const [deckCards, setDeckCards] = useState<Record<string, DeckCard[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [scrollPosition, setScrollPosition] = useState<Record<string, number>>({});
  // undefined = not yet measured, true = overflows, false = does not overflow
  const [overflows, setOverflows] = useState<Record<string, boolean | undefined>>({});
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const loadedDecksRef = useRef<Set<string>>(new Set());

  const isOwnProfile = forceIsOwnProfile ?? (viewedUserId === viewerId);

  const fetchDeckCards = useCallback(async (deck: Deck) => {
    // Skip if already loading or loaded
    if (loadedDecksRef.current.has(deck.id) || loading[deck.id]) {
      return;
    }

    loadedDecksRef.current.add(deck.id);
    setLoading((p) => ({ ...p, [deck.id]: true }));

    try {
      const url = isOwnProfile ? `/api/decks/${deck.id}` : `/api/decks/${deck.id}?viewOnly=true`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        if (data.deckJson) {
          try {
            const cards = JSON.parse(data.deckJson);
            setDeckCards((p) => ({
              ...p,
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
      setLoading((p) => ({ ...p, [deck.id]: false }));
    }
  }, [isOwnProfile, loading]);

  const handleScroll = (deckId: string, direction: "left" | "right") => {
    const container = scrollContainerRefs.current[deckId];
    if (!container) return;

    const cardWidth = container.offsetWidth / 10; // 10 cards fit the width
    const scrollAmount = cardWidth * 5; // Scroll 5 cards at a time

    const newPosition = direction === "left"
      ? Math.max(0, (scrollPosition[deckId] || 0) - scrollAmount)
      : (scrollPosition[deckId] || 0) + scrollAmount;

    container.scrollLeft = newPosition;
    setScrollPosition((prev) => ({ ...prev, [deckId]: newPosition }));
  };

  useEffect(() => {
    // Load cards for all decks when component mounts
    decks.forEach((deck) => {
      fetchDeckCards(deck);
    });
  }, [decks, isOwnProfile, fetchDeckCards]);

  useEffect(() => {
    // Re-measure container overflow after cards render.
    // By the time this effect runs, React has committed the DOM and set all refs.
    const newOverflows: Record<string, boolean> = {};
    for (const deck of decks) {
      const el = scrollContainerRefs.current[deck.id];
      if (el) {
        newOverflows[deck.id] = el.scrollWidth > el.clientWidth;
      }
    }
    setOverflows((prev) => ({ ...prev, ...newOverflows }));
  }, [deckCards, decks]);

  if (decks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {isOwnProfile ? "尚未建立任何牌組。" : "尚無公開牌組。"}
      </p>
    );
  }

  const getIsLeftButtonDisabled = (deckId: string): boolean => {
    return (scrollPosition[deckId] || 0) === 0;
  };

  const getIsRightButtonDisabled = (deckId: string): boolean => {
    const isOverflowing = overflows[deckId];
    // Not yet measured — optimistically enable the button
    if (isOverflowing === undefined) return false;
    // Measured: container doesn't overflow at all
    if (!isOverflowing) return true;
    // Measured: overflows — disable only when fully scrolled to the right
    const container = scrollContainerRefs.current[deckId];
    if (!container) return false;
    const currentScroll = scrollPosition[deckId] || 0;
    const maxScroll = container.scrollWidth - container.clientWidth;
    return currentScroll >= maxScroll;
  };

  return (
    <div className="space-y-4">
      {decks.map((d) => {
        const cards = deckCards[d.id] || [];
        const isLoading = loading[d.id];
        const cardWidth = 100; // Base width in pixels
        const cardHeight = 140; // Base height in pixels

        return (
          <div
            key={d.id}
            className="card card-hover overflow-hidden transition-all duration-200 space-y-3 p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {isOwnProfile ? (
                  <Link
                    href={`/decks/${d.id}/edit`}
                    className="font-medium text-foreground hover:text-primary transition-colors block"
                  >
                    {d.title}
                  </Link>
                ) : (
                  <div className="font-medium text-foreground">
                    {d.title}
                  </div>
                )}
                {d.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">{d.notes}</p>
                ) : null}
                <span className="mt-2 inline-block text-xs text-muted-foreground">
                  {getVisibilityLabel(d.visibility)}
                </span>
              </div>
            </div>

            {/* Cards container with horizontal scroll */}
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                載入中...
              </div>
            ) : cards.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                尚未加入卡片
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Left scroll button */}
                <button
                  onClick={() => handleScroll(d.id, "left")}
                  className="p-2 hover:bg-neutral-100 rounded transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="向左滾動"
                  disabled={getIsLeftButtonDisabled(d.id)}
                >
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Scrollable cards container */}
                <div
                  ref={(el) => {
                    scrollContainerRefs.current[d.id] = el;
                  }}
                  className="flex-1 overflow-x-auto"
                  style={{
                    scrollBehavior: "smooth",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  } as React.CSSProperties}
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement;
                    setScrollPosition((prev) => ({
                      ...prev,
                      [d.id]: target.scrollLeft,
                    }));
                  }}
                >
                  <div className="flex gap-2" style={{ width: "fit-content" }}>
                    {cards.map((card, idx) => (
                      <div
                        key={idx}
                        className="relative shrink-0"
                        style={{
                          width: `${cardWidth}px`,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {/* Card image */}
                        <div className="relative mb-1">
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="w-full rounded object-cover border border-neutral-200 hover:border-primary/50"
                              style={{ height: `${cardHeight}px` }}
                              title={`${card.name} x${card.count}`}
                            />
                          ) : (
                            <div
                              className="rounded border border-neutral-200 bg-neutral-100 flex items-center justify-center text-xs text-center p-1"
                              style={{ height: `${cardHeight}px` }}
                            >
                              <span className="text-muted-foreground truncate line-clamp-3">
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

                        {/* Card name below thumbnail */}
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {card.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right scroll button */}
                <button
                  onClick={() => handleScroll(d.id, "right")}
                  className="p-2 hover:bg-neutral-100 rounded transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="向右滾動"
                  disabled={getIsRightButtonDisabled(d.id)}
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
