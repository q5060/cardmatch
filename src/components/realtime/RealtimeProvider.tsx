"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeEvent } from "@/lib/realtime/types";

type Handler = (event: RealtimeEvent) => void;

type RealtimeContextValue = {
  connected: boolean;
  subscribe: (handler: Handler) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const MAX_BACKOFF_MS = 30_000;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(new Set<Handler>());
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const dispatch = useCallback((event: RealtimeEvent) => {
    for (const handler of handlersRef.current) {
      handler(event);
    }
  }, []);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/realtime/stream");
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      backoffRef.current = 1000;
    };

    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as RealtimeEvent;
        if (parsed.type === "connected") {
          setConnected(true);
        }
        dispatch(parsed);
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      reconnectTimerRef.current = window.setTimeout(() => {
        connectRef.current?.();
      }, delay);
    };
  }, [dispatch]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    const id = window.setTimeout(() => connect(), 0);
    return () => {
      window.clearTimeout(id);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  const value = useMemo(
    () => ({ connected, subscribe }),
    [connected, subscribe],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    return {
      connected: false,
      subscribe: () => () => {},
    };
  }
  return ctx;
}
