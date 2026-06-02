import Link from "next/link";
import {
  submitCreateDeck,
  deleteDeck,
  updateDeckVisibility,
} from "@/actions/decks";
import { DECK_VISIBILITY } from "@/lib/constants";
import { PublicDeckList } from "./PublicDeckList";

type Deck = {
  id: string;
  title: string;
  notes: string;
  visibility: string;
  deckJson?: string | null;
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

function getNextVisibility(current: string): string {
  switch (current) {
    case DECK_VISIBILITY.PUBLIC:
      return DECK_VISIBILITY.FRIENDS;
    case DECK_VISIBILITY.FRIENDS:
      return DECK_VISIBILITY.PRIVATE;
    case DECK_VISIBILITY.PRIVATE:
    default:
      return DECK_VISIBILITY.PUBLIC;
  }
}

export function DeckSection({ decks, readOnly = false }: { decks: Deck[]; readOnly?: boolean }) {
  if (readOnly) {
    // Read-only mode: show decks with thumbnails using PublicDeckList
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">牌組</h3>
          <Link href="/settings?tab=decks" className="btn btn-primary btn-sm">
            管理牌組
          </Link>
        </div>

        {decks.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未建立任何牌組。</p>
        ) : (
          <PublicDeckList decks={decks.map(d => ({...d, deckJson: d.deckJson || null}))} isOwnProfile={true} />
        )}
      </div>
    );
  }

  // Edit mode: show form and edit controls (for settings page)
  return (
    <div className="space-y-6">
      <form action={submitCreateDeck} className="card card-hover space-y-4 p-5">
        <h3 className="font-semibold text-foreground">新增牌組</h3>
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">牌組名稱</span>
          <input name="title" required className="input-field mt-2" />
        </label>
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">備註</span>
          <textarea name="notes" rows={2} className="input-field mt-2 min-h-[4rem] resize-y" />
        </label>
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">隱私</span>
          <select name="visibility" className="input-field mt-2">
            <option value={DECK_VISIBILITY.PUBLIC}>公開</option>
            <option value={DECK_VISIBILITY.FRIENDS}>限好友</option>
            <option value={DECK_VISIBILITY.PRIVATE}>私人</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">匯入（選填，貼上 JSON 或文字）</span>
          <textarea
            name="deckJson"
            rows={3}
            placeholder="稍後可串接官方牌組格式…"
            className="input-field mt-2 font-mono text-xs"
          />
        </label>
        <button type="submit" className="btn btn-secondary">
          建立牌組
        </button>
      </form>

      <ul className="space-y-3">
        {decks.map((d) => (
          <li
            key={d.id}
            className="card card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div className="font-medium text-foreground">{d.title}</div>
              {d.notes ? (
                <p className="mt-1 text-sm text-muted-foreground">{d.notes}</p>
              ) : null}
              <span className="mt-1 inline-block text-xs text-muted-foreground">
                {getVisibilityLabel(d.visibility)}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/decks/${d.id}/edit`} className="btn btn-outline btn-sm">
                編輯
              </Link>
              <form
                action={updateDeckVisibility.bind(
                  null,
                  d.id,
                  getNextVisibility(d.visibility),
                )}
              >
                <button type="submit" className="btn btn-outline btn-sm">
                  切換為{getVisibilityLabel(getNextVisibility(d.visibility))}
                </button>
              </form>
              <form action={deleteDeck.bind(null, d.id)}>
                <button
                  type="submit"
                  className="rounded-md bg-red-500/15 px-3 py-1 text-xs font-medium text-red-800 transition hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  刪除
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
