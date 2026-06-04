import type { DeckSummary } from "@/lib/matchDeck";
import { DeckVisibilityBadge } from "@/components/battle/DeckVisibilityBadge";

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
      {myDeck ? (
        <span className="ml-1 inline-block align-middle">
          <DeckVisibilityBadge visibility={myDeck.visibility} />
        </span>
      ) : null}
      <span className="mx-1">·</span>
      <span>對手：{deckName(otherDeck)}</span>
      {otherDeck ? (
        <span className="ml-1 inline-block align-middle">
          <DeckVisibilityBadge visibility={otherDeck.visibility} />
        </span>
      ) : null}
    </p>
  );
}
