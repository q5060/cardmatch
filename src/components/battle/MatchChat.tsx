"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessageRow } from "@/components/chat/ChatMessageRow";
import {
  shouldAnimateChatMessage,
  useChatLastMessageRef,
  useSyncChatLastMessageId,
} from "@/hooks/useChatMessageAnimation";
import type { ChatMessageDTO, RealtimeEvent } from "@/lib/realtime/types";
import {
  useRealtimeConnected,
  useRealtimeEvent,
} from "@/hooks/useRealtimeEvent";

type Msg = ChatMessageDTO;

function isOwnMessage(m: Msg, currentUserId: number): boolean {
  return m.senderId === currentUserId;
}

function mergeMessages(prev: Msg[], incoming: Msg[]): Msg[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function MatchChat({
  matchId,
  currentUserId,
}: {
  matchId: string;
  currentUserId: number;
}) {
  const sseConnected = useRealtimeConnected();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const lastAfterRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useChatLastMessageRef();
  useSyncChatLastMessageId(messages, prevLastMessageIdRef);

  const pull = useCallback(async (initial = false) => {
    const url = new URL(`/api/matches/${matchId}/messages`, window.location.origin);
    if (!initial && lastAfterRef.current) {
      url.searchParams.set("afterTime", lastAfterRef.current);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      setFetchErr(res.status === 404 ? "無法載入聊天（約戰狀態或權限不符）" : "無法載入訊息");
      return;
    }
    setFetchErr(null);
    const data = (await res.json()) as { messages: Msg[] };
    if (data.messages.length === 0) return;
    const normalized = data.messages.map((m) => ({
      ...m,
      createdAt:
        typeof m.createdAt === "string"
          ? m.createdAt
          : new Date(m.createdAt).toISOString(),
    }));
    lastAfterRef.current = normalized[normalized.length - 1]!.createdAt;
    setMessages((prev) =>
      initial ? normalized : mergeMessages(prev, normalized),
    );
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await pull(true);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [pull]);

  useEffect(() => {
    if (sseConnected) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void pull(false);
    }, 12_000);
    return () => window.clearInterval(id);
  }, [pull, sseConnected]);

  const onMessage = useCallback(
    (e: RealtimeEvent) => {
      if (e.type !== "message.new" || e.channel !== "match") return;
      if (String(e.matchId) !== matchId) return;
      const m = e.message;
      lastAfterRef.current = m.createdAt;
      setMessages((prev) => mergeMessages(prev, [m]));
    },
    [matchId],
  );

  useRealtimeEvent(
    (e) => e.type === "message.new" && e.channel === "match",
    onMessage,
  );

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
        const data = (await res.json()) as {
          message: {
            id: string;
            senderId: number;
            body: string;
            createdAt: string;
            sender: { id: number; displayName: string };
          };
        };
        const m: Msg = {
          id: data.message.id,
          senderId: data.message.senderId,
          body: data.message.body,
          createdAt:
            typeof data.message.createdAt === "string"
              ? data.message.createdAt
              : new Date(data.message.createdAt).toISOString(),
          sender: data.message.sender,
        };
        lastAfterRef.current = m.createdAt;
        setMessages((prev) => mergeMessages(prev, [m]));
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
          <p className="text-sm text-muted-foreground">尚無訊息</p>
        ) : (
          messages.map((m, index) => (
            <ChatMessageRow
              key={m.id}
              message={m}
              mine={isOwnMessage(m, currentUserId)}
              animateEnter={shouldAnimateChatMessage(messages, index, prevLastMessageIdRef)}
            />
          ))
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
