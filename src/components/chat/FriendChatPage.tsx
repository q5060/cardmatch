"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserCircle, ChevronUp } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
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

function mergeMessages(prev: Msg[], incoming: Msg[]): Msg[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

type OtherUser = {
  id: number;
  displayName: string;
  avatarUrl?: string | null;
};

function isOwnMessage(m: Msg, currentUserId: number): boolean {
  const sid = m.senderId ?? m.sender?.id;
  return Boolean(sid && currentUserId && sid === currentUserId);
}

export function FriendChatPage({
  friendshipId,
  currentUserId,
  otherUser,
}: {
  friendshipId: string;
  currentUserId: number;
  otherUser: OtherUser;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastAfterRef = useRef<string | null>(null);
  const prevLastMessageIdRef = useChatLastMessageRef();
  useSyncChatLastMessageId(messages, prevLastMessageIdRef);
  const sseConnected = useRealtimeConnected();

  const pullNew = useCallback(async () => {
    const url = new URL(
      `/api/friendships/${friendshipId}/messages`,
      window.location.origin,
    );
    url.searchParams.set("offset", "0");
    url.searchParams.set("limit", "30");
    if (lastAfterRef.current) {
      url.searchParams.set("afterTime", lastAfterRef.current);
    }
    const res = await fetch(url.toString());
    if (!res.ok) return;
    const data = (await res.json()) as { messages: Msg[] };
    if (data.messages.length === 0) return;
    const normalized = data.messages.map((m) => ({
      ...m,
      senderId: m.senderId ?? m.sender?.id ?? 0,
      createdAt:
        typeof m.createdAt === "string"
          ? m.createdAt
          : new Date(m.createdAt).toISOString(),
    }));
    lastAfterRef.current = normalized[normalized.length - 1]!.createdAt;
    setMessages((prev) => mergeMessages(prev, normalized));
  }, [friendshipId]);

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/friendships/${friendshipId}/messages?offset=0&limit=30`,
        );
        if (!res.ok) {
          setFetchErr("無法載入聊天");
          return;
        }
        const data = (await res.json()) as {
          messages: Msg[];
          hasMore: boolean;
        };
        const normalized = data.messages.map((m) => ({
          ...m,
          senderId: m.senderId ?? m.sender?.id ?? 0,
          createdAt:
            typeof m.createdAt === "string"
              ? m.createdAt
              : new Date(m.createdAt).toISOString(),
        }));
        setMessages(normalized);
        if (normalized.length > 0) {
          lastAfterRef.current = normalized[normalized.length - 1]!.createdAt;
        }
        setOffset(0);
        setHasMore(data.hasMore);
        setFetchErr(null);

        if (messagesContainerRef.current) {
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            }
          }, 0);
        }
      } catch {
        setFetchErr("無法載入訊息");
      } finally {
        setLoading(false);
      }
    }

    void loadMessages();
  }, [friendshipId]);

  useEffect(() => {
    if (sseConnected) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void pullNew();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [pullNew, sseConnected]);

  const onMessage = useCallback(
    (e: RealtimeEvent) => {
      if (e.type !== "message.new" || e.channel !== "friend") return;
      if (e.friendshipId !== friendshipId) return;
      const m = e.message;
      lastAfterRef.current = m.createdAt;
      setMessages((prev) => mergeMessages(prev, [m]));
    },
    [friendshipId],
  );

  useRealtimeEvent(
    (e) => e.type === "message.new" && e.channel === "friend",
    onMessage,
  );

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const newOffset = offset + 30;
      const res = await fetch(
        `/api/friendships/${friendshipId}/messages?offset=${newOffset}&limit=30`
      );
      if (!res.ok) {
        setFetchErr("無法載入更多訊息");
        return;
      }
      const data = (await res.json()) as {
        messages: Msg[];
        totalCount: number;
        offset: number;
        hasMore: boolean;
      };
      // Combine messages - new ones go before existing
      setMessages([...data.messages, ...messages]);
      setOffset(newOffset);
      setHasMore(data.hasMore);
    } catch {
      setFetchErr("無法載入更多訊息");
    } finally {
      setIsLoadingMore(false);
    }
  }, [friendshipId, messages, offset]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendErr(null);
    try {
      const res = await fetch(`/api/friendships/${friendshipId}/messages`, {
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
        setFetchErr(null);
      } else {
        setSendErr(
          res.status === 404 ? "無法送出（狀態或權限不符）" : "送出失敗"
        );
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            社交
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            私訊
          </h1>
        </header>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="space-y-2">
        <BackLink label="返回好友" />
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border">
            {otherUser.avatarUrl ? (
              <Image
                src={otherUser.avatarUrl}
                alt={otherUser.displayName}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                <UserCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <Link
              href={`/profile/${otherUser.id}`}
              className="font-semibold text-foreground hover:text-primary"
            >
              {otherUser.displayName}
            </Link>
            <p className="text-xs text-muted-foreground">與 {otherUser.displayName} 的對話</p>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="card flex min-h-[min(600px,calc(100dvh-12rem))] flex-col overflow-hidden p-0">
        {/* Messages */}
        <div
          ref={messagesContainerRef}
          dir="ltr"
          className="flex min-w-0 flex-1 flex-col space-y-2 overflow-y-auto px-3 py-3 text-sm"
        >
          {fetchErr ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
              role="status"
            >
              {fetchErr}
            </p>
          ) : null}

          {hasMore && (
            <button
              onClick={() => loadMore()}
              disabled={isLoadingMore}
              className="mx-auto flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
            >
              <ChevronUp className="h-3 w-3" />
              {isLoadingMore ? "載入中..." : "載入更多訊息"}
            </button>
          )}

          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center px-4">
              尚無訊息，在這裡開啟你們之間的第一句話。
            </p>
          ) : (
            messages.map((m, index) => (
              <ChatMessageRow
                key={m.id}
                message={{
                  id: m.id,
                  senderId: m.senderId ?? m.sender?.id ?? 0,
                  body: m.body,
                  sender: {
                    id: m.sender?.id ?? m.senderId ?? 0,
                    displayName: m.sender?.displayName ?? "使用者",
                  },
                }}
                mine={isOwnMessage(m, currentUserId)}
                animateEnter={shouldAnimateChatMessage(messages, index, prevLastMessageIdRef)}
              />
            ))
          )}
        </div>

        {/* Input */}
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
              placeholder="傳訊息給好友…"
              className="input-field min-w-0 flex-1 text-sm"
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary shrink-0"
            >
              送出
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
