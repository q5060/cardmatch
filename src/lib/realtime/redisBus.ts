import Redis from "ioredis";
import type { RealtimeBus } from "./bus";
import {
  parseRealtimeEvent,
  serializeRealtimeEvent,
  userChannel,
} from "./channels";
import type { RealtimeEnqueue, RealtimeSubscription } from "./types";

type UserChannelState = {
  enqueues: Set<RealtimeEnqueue>;
  refCount: number;
  subscriber: Redis | null;
};

const globalForRedis = globalThis as unknown as {
  __cardmatchRedisPublisher?: Redis;
  __cardmatchRedisChannels?: Map<number, UserChannelState>;
  __cardmatchRedisBus?: RealtimeBus;
};

function getPublisher(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required for Redis realtime bus");
  }

  if (!globalForRedis.__cardmatchRedisPublisher) {
    globalForRedis.__cardmatchRedisPublisher = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  return globalForRedis.__cardmatchRedisPublisher;
}

function getChannelStates(): Map<number, UserChannelState> {
  if (!globalForRedis.__cardmatchRedisChannels) {
    globalForRedis.__cardmatchRedisChannels = new Map();
  }
  return globalForRedis.__cardmatchRedisChannels;
}

function fanOut(state: UserChannelState, message: string) {
  const event = parseRealtimeEvent(message);
  if (!event) return;

  for (const enqueue of state.enqueues) {
    try {
      enqueue(event);
    } catch {
      // drop failed delivery
    }
  }
}

async function ensureSubscriber(userId: number, state: UserChannelState) {
  if (state.subscriber) return;

  const channel = userChannel(userId);
  const subscriber = getPublisher().duplicate();

  subscriber.on("message", (ch, message) => {
    if (ch !== channel || typeof message !== "string") return;
    fanOut(state, message);
  });

  subscriber.on("error", (err) => {
    console.error(`Redis subscriber error (user ${userId}):`, err);
  });

  state.subscriber = subscriber;
  await subscriber.subscribe(channel);
}

async function teardownSubscriber(userId: number, state: UserChannelState) {
  const sub = state.subscriber;
  state.subscriber = null;
  if (!sub) return;

  try {
    await sub.unsubscribe(userChannel(userId));
    await sub.quit();
  } catch (err) {
    console.error(`Redis subscriber teardown failed (user ${userId}):`, err);
    sub.disconnect();
  }
}

function createRedisBus(): RealtimeBus {
  return {
    subscribe(userId: number, enqueue: RealtimeEnqueue): RealtimeSubscription {
      const channels = getChannelStates();
      let state = channels.get(userId);

      if (!state) {
        state = { enqueues: new Set(), refCount: 0, subscriber: null };
        channels.set(userId, state);
        void ensureSubscriber(userId, state).catch((err) => {
          console.error(`Redis subscribe setup failed (user ${userId}):`, err);
        });
      }

      state.enqueues.add(enqueue);
      state.refCount += 1;

      return {
        unsubscribe() {
          const current = channels.get(userId);
          if (!current) return;

          current.enqueues.delete(enqueue);
          current.refCount -= 1;

          if (current.refCount > 0) return;

          channels.delete(userId);
          void teardownSubscriber(userId, current);
        },
      };
    },

    publish(userId: number, event) {
      const channel = userChannel(userId);
      const payload = serializeRealtimeEvent(event);

      void getPublisher()
        .publish(channel, payload)
        .catch((err) => {
          console.error(`Redis publish failed (user ${userId}):`, err);
        });
    },
  };
}

export function getRedisBus(): RealtimeBus {
  if (!globalForRedis.__cardmatchRedisBus) {
    globalForRedis.__cardmatchRedisBus = createRedisBus();
  }
  return globalForRedis.__cardmatchRedisBus;
}
