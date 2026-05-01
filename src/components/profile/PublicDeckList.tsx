type Deck = {
  id: string;
  title: string;
  notes: string;
};

export function PublicDeckList({ decks }: { decks: Deck[] }) {
  if (decks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">尚無公開牌組。</p>
    );
  }

  return (
    <ul className="space-y-3">
      {decks.map((d) => (
        <li
          key={d.id}
          className="card card-hover flex flex-col gap-2 p-4 sm:flex-row sm:items-start"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground">{d.title}</div>
            {d.notes ? (
              <p className="mt-1 text-sm text-muted-foreground">{d.notes}</p>
            ) : null}
            <span className="mt-1 inline-block text-xs text-muted-foreground">
              公開
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
