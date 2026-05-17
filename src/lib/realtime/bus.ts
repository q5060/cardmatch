import type { RealtimeEnqueue, RealtimeEvent, RealtimeSubscription } from "./types";

export interface RealtimeBus {
  subscribe(userId: number, enqueue: RealtimeEnqueue): RealtimeSubscription;
  publish(userId: number, event: RealtimeEvent): void;
}
