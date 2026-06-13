"use client";

import Image from "next/image";
import type { DeckCardRow } from "@/lib/matchDeck";

type Props = {
  title: string;
  cards: DeckCardRow[];
  emptyLabel?: string;
};

export function DeckCardStrip({ title, cards, emptyLabel = "此牌組沒有卡牌資料" }: Props) {
  if (cards.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((card, i) => (
          <div
            key={`${card.id}-${i}`}
            className="relative shrink-0 w-[72px]"
          >
            {card.imageUrl ? (
              <Image
                src={card.imageUrl}
                alt={card.name}
                width={72}
                height={100}
                className="h-[100px] w-[72px] rounded-md object-cover shadow-sm"
                unoptimized
              />
            ) : (
              <div className="flex h-[100px] w-[72px] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                {card.name}
              </div>
            )}
            {card.count > 1 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
                {card.count}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
