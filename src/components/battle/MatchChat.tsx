"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = {
  id: string;
  senderId?: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

function isOwnMessage(m: Msg, currentUserId: string): boolean {
  const sid = m.senderId ?? m.sender?.id;
  return Boolean(sid && currentUserId && String(sid) === String(currentUserId));
}

export function MatchChat({
  matchId,
  currentUserId,
}: {
  matchId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (cancelled) return;
      if (!res.ok) {
        setFetchErr(res.status === 404 ? "無法載入聊天（約戰狀態或權限不符）" : "無法載入訊息");
        return;
      }
      setFetchErr(null);
      const data = (await res.json()) as { messages: Msg[] };
      setMessages(data.messages);
    }

    const first = window.setTimeout(() => void pull(), 0);
    const interval = window.setInterval(() => void pull(), 4000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendErr(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setText("");
        const r = await fetch(`/api/matches/${matchId}/messages`);
        if (r.ok) {
          setFetchErr(null);
          const data = (await r.json()) as { messages: Msg[] };
          setMessages(data.messages);
        } else {
          setFetchErr("送出成功但重新載入失敗");
        }
      } else {
        setSendErr(res.status === 404 ? "無法送出（約戰狀態或權限不符）" : "送出失敗");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex h-full min-h-[280px] flex-col overflow-hidden p-0">
      <div className="border-b border-border bg-gray-50/80 px-4 py-3 text-sm font-semibold text-foreground backdrop-blur-sm">
        約戰聊天
      </div>
      <div
        dir="ltr"
        className="flex min-w-0 flex-1 flex-col space-y-2 overflow-y-auto px-3 py-3 text-sm"
      >
        {fetchErr ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950" role="status">
            {fetchErr}
          </p>
        ) : null}
        {messages.length === 0 ? (
          <p className="text-muted-foreground">尚無訊息，先打聲招呼吧。</p>
        ) : (
          messages.map((m) => {
            const mine = isOwnMessage(m, currentUserId);
            return (
              <div key={m.id} className="flex w-full min-w-0 justify-start">
                <div
                  className={`max-w-[85%] shrink-0 rounded-xl px-3 py-2 shadow-sm ${
                    mine
                      ? "ml-auto bg-primary text-white"
                      : "bg-[var(--bubble-other)] text-foreground ring-1 ring-black/[0.04]"
                  }`}
                >
                  {!mine ? (
                    <div className="mb-1 text-xs opacity-70">
                      <Link
                        href={`/profile/${m.sender.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {m.sender.displayName}
                      </Link>
                    </div>
                  ) : null}
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => void send(e)}
        className="flex flex-col gap-2 border-t border-border bg-card p-2"
      >
        {sendErr ? (
          <p className="text-xs text-red-700" role="alert">
            {sendErr}
          </p>
        ) : null}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="輸入訊息…"
            className="input-field min-w-0 flex-1 text-sm"
            maxLength={4000}
          />
          <button type="submit" disabled={sending} className="btn btn-primary shrink-0">
            送出
          </button>
        </div>
      </form>
    </div>
  );
}
