"use client";

import { useEffect, useRef, useState } from "react";

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

export function FriendChat({
  friendshipId,
  currentUserId,
}: {
  friendshipId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      const res = await fetch(`/api/friendships/${friendshipId}/messages`);
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
  }, [friendshipId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/friendships/${friendshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setText("");
        const r = await fetch(`/api/friendships/${friendshipId}/messages`);
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
    <div className="card flex min-h-[360px] flex-col overflow-hidden p-0">
      <div
        dir="ltr"
        className="flex min-w-0 flex-1 flex-col space-y-2 overflow-y-auto px-3 py-3 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-muted-foreground">尚無訊息。</p>
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
          placeholder="傳訊息給好友…"
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
