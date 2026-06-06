import type { DeckSummary } from "@/lib/matchDeck";

function deckName(deck: DeckSummary | null): string {
  if (!deck) return "未選擇";
  return deck.title;
}

type Props = {
  myDeck: DeckSummary | null;
  otherDeck: DeckSummary | null;
};

export function MatchFeedDeckLine({ myDeck, otherDeck }: Props) {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      <span>我的牌組：{deckName(myDeck)}</span>
      <span className="mx-1">·</span>
      <span>對手：{deckName(otherDeck)}</span>
    </p>
  );
}
