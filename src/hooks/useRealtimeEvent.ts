"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "@/lib/realtime/types";
import { useRealtimeContext } from "@/components/realtime/RealtimeProvider";

export function useRealtimeConnected(): boolean {
  return useRealtimeContext().connected;
}

export function useRealtimeEvent(
  filter: (event: RealtimeEvent) => boolean,
  handler: (event: RealtimeEvent) => void,
) {
  const { subscribe } = useRealtimeContext();
  const filterRef = useRef(filter);
  const handlerRef = useRef(handler);

  useEffect(() => {
    filterRef.current = filter;
    handlerRef.current = handler;
  });

  useEffect(() => {
    return subscribe((event) => {
      if (filterRef.current(event)) handlerRef.current(event);
    });
  }, [subscribe]);
}
