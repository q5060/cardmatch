"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string };
};

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (cancelled || !res.ok) return;
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
          const data = (await r.json()) as { messages: Msg[] };
          setMessages(data.messages);
        }
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
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-muted-foreground">尚無訊息，先打聲招呼吧。</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender.id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm ${
                    mine
                      ? "bg-primary text-white"
                      : "bg-[var(--bubble-other)] text-foreground ring-1 ring-black/[0.04]"
                  }`}
                >
                  {!mine ? (
                    <div className="mb-1 text-xs opacity-70">{m.sender.displayName}</div>
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
        className="flex gap-2 border-t border-border bg-card p-2"
      >
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
      </form>
    </div>
  );
}
