import { DECK_VISIBILITY } from "@/lib/constants";

export function getDeckVisibilityLabel(visibility: string): string {
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

export function DeckVisibilityBadge({ visibility }: { visibility: string }) {
  return (
    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {getDeckVisibilityLabel(visibility)}
    </span>
  );
}
