"use client";

import { useEffect, useState } from "react";

type DeckOption = {
  id: string;
  name: string;
  visibility: string;
  cardCount: number;
};

type Props = {
  value: string | null;
  onChange: (deckId: string | null) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
};

export function DeckPickerField({
  value,
  onChange,
  disabled,
  label = "牌組（選填）",
  id = "deck-picker",
}: Props) {
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/decks");
        if (!res.ok) throw new Error("無法載入牌組");
        const data = (await res.json()) as DeckOption[];
        if (!cancelled) setDecks(data);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "載入失敗");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label className="block text-sm font-medium text-foreground" htmlFor={id}>
      <span className="text-muted-foreground">{label}</span>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value || null)}
        className="input-field mt-2"
      >
        <option value="">不選擇</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
            {d.cardCount > 0 ? `（${d.cardCount} 張）` : ""}
          </option>
        ))}
      </select>
      {loading ? (
        <p className="mt-1 text-xs text-muted-foreground">載入牌組中…</p>
      ) : null}
      {err ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      {!loading && !err && decks.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          尚無牌組，可至個人檔案建立。
        </p>
      ) : null}
    </label>
  );
}
