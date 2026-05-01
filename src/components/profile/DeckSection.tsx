import {
  createDeck,
  deleteDeck,
  updateDeckVisibility,
} from "@/actions/decks";
import { DECK_VISIBILITY } from "@/lib/constants";

type Deck = {
  id: string;
  title: string;
  notes: string;
  visibility: string;
};

export function DeckSection({ decks }: { decks: Deck[] }) {
  return (
    <div className="space-y-6">
      <form action={createDeck} className="card card-hover space-y-4 p-5">
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
                {d.visibility === DECK_VISIBILITY.PRIVATE ? "私人" : "公開"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <form
                action={updateDeckVisibility.bind(
                  null,
                  d.id,
                  d.visibility === DECK_VISIBILITY.PRIVATE
                    ? DECK_VISIBILITY.PUBLIC
                    : DECK_VISIBILITY.PRIVATE,
                )}
              >
                <button type="submit" className="btn btn-outline btn-sm">
                  切換為{d.visibility === DECK_VISIBILITY.PRIVATE ? "公開" : "私人"}
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
