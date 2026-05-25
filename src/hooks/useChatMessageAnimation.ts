"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export function useChatLastMessageRef(): MutableRefObject<string | null> {
  return useRef<string | null>(null);
}

export function useSyncChatLastMessageId(
  messages: { id: string }[],
  prevLastIdRef: MutableRefObject<string | null>,
) {
  useEffect(() => {
    if (messages.length > 0) {
      prevLastIdRef.current = messages[messages.length - 1]!.id;
    }
  }, [messages, prevLastIdRef]);
}

export function shouldAnimateChatMessage(
  messages: { id: string }[],
  index: number,
  prevLastIdRef: MutableRefObject<string | null>,
): boolean {
  if (prefersReducedMotion() || index !== messages.length - 1 || messages.length === 0) {
    return false;
  }
  const lastId = messages[messages.length - 1]!.id;
  return lastId !== prevLastIdRef.current;
}
