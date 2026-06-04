import type { DeckSummaryWithCards } from "@/lib/matchDeck";
import { DeckVisibilityBadge } from "@/components/battle/DeckVisibilityBadge";

export function formatDeckLabel(deck: DeckSummaryWithCards | null): string {
  if (!deck) return "未選擇";
  return deck.title;
}

type Props = {
  label: string;
  deck: DeckSummaryWithCards | null;
};

export function MatchDeckSummaryLine({ label, deck }: Props) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}：</span>
      <span className="font-medium text-foreground">{formatDeckLabel(deck)}</span>
      {deck ? (
        <span className="ml-2">
          <DeckVisibilityBadge visibility={deck.visibility} />
        </span>
      ) : null}
    </div>
  );
}
