import type { RealtimeBus } from "./bus";
import type { RealtimeEnqueue, RealtimeEvent, RealtimeSubscription } from "./types";

function createMemoryBus(): RealtimeBus {
  const subscribers = new Map<number, Set<RealtimeEnqueue>>();

  return {
    subscribe(userId: number, enqueue: RealtimeEnqueue): RealtimeSubscription {
      let set = subscribers.get(userId);
      if (!set) {
        set = new Set();
        subscribers.set(userId, set);
      }
      set.add(enqueue);
      return {
        unsubscribe() {
          const current = subscribers.get(userId);
          if (!current) return;
          current.delete(enqueue);
          if (current.size === 0) subscribers.delete(userId);
        },
      };
    },

    publish(userId: number, event: RealtimeEvent) {
      const set = subscribers.get(userId);
      if (!set) return;
      for (const enqueue of set) {
        try {
          enqueue(event);
        } catch {
          // drop failed delivery
        }
      }
    },
  };
}

const globalForBus = globalThis as unknown as { __cardmatchRealtimeBus?: RealtimeBus };

export function getMemoryBus(): RealtimeBus {
  if (!globalForBus.__cardmatchRealtimeBus) {
    globalForBus.__cardmatchRealtimeBus = createMemoryBus();
  }
  return globalForBus.__cardmatchRealtimeBus;
}
