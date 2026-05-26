import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseRealtimeEvent,
  serializeRealtimeEvent,
  userChannel,
} from "@/lib/realtime/channels";

const subscribeMock = vi.fn().mockResolvedValue(undefined);
const publishMock = vi.fn().mockResolvedValue(1);
const quitMock = vi.fn().mockResolvedValue("OK");
const unsubscribeMock = vi.fn().mockResolvedValue(undefined);

function createSubscriberClient() {
  return {
    subscribe: subscribeMock,
    unsubscribe: unsubscribeMock,
    quit: quitMock,
    disconnect: vi.fn(),
    on: vi.fn(),
  };
}

const duplicateMock = vi.fn(() => createSubscriberClient());

vi.mock("ioredis", () => {
  class MockRedis {
    subscribe = subscribeMock;
    unsubscribe = unsubscribeMock;
    quit = quitMock;
    disconnect = vi.fn();
    on = vi.fn();
    publish = publishMock;
    duplicate = duplicateMock;
  }

  return { default: MockRedis };
});

describe("realtime channels", () => {
  it("builds per-user channel names", () => {
    expect(userChannel(42)).toBe("cardmatch:user:42");
  });

  it("round-trips notification events", () => {
    const event = { type: "notification.new" as const, unreadCount: 3 };
    const raw = serializeRealtimeEvent(event);
    expect(parseRealtimeEvent(raw)).toEqual(event);
  });

  it("returns null for invalid JSON", () => {
    expect(parseRealtimeEvent("not-json")).toBeNull();
  });
});

describe("redis bus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    const g = globalThis as unknown as {
      __cardmatchRedisPublisher?: unknown;
      __cardmatchRedisChannels?: unknown;
      __cardmatchRedisBus?: unknown;
    };
    delete g.__cardmatchRedisPublisher;
    delete g.__cardmatchRedisChannels;
    delete g.__cardmatchRedisBus;
    process.env.REDIS_URL = "redis://127.0.0.1:6379";
    process.env.REALTIME_BUS = "redis";
  });

  it("publishes serialized events to the user channel", async () => {
    const { getRedisBus } = await import("@/lib/realtime/redisBus");
    const bus = getRedisBus();
    const event = { type: "connected" as const };

    bus.publish(7, event);

    await vi.waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith(
        "cardmatch:user:7",
        JSON.stringify(event),
      );
    });
  });

  it("subscribes on first local enqueue and tears down at zero ref", async () => {
    const { getRedisBus } = await import("@/lib/realtime/redisBus");
    const bus = getRedisBus();

    const sub = bus.subscribe(9, vi.fn());

    await vi.waitFor(() => {
      expect(subscribeMock).toHaveBeenCalledWith("cardmatch:user:9");
    });

    sub.unsubscribe();

    await vi.waitFor(() => {
      expect(unsubscribeMock).toHaveBeenCalledWith("cardmatch:user:9");
      expect(quitMock).toHaveBeenCalled();
    });
  });

  it("getBus selects redis when configured", async () => {
    const { getBus } = await import("@/lib/realtime/getBus");
    const bus = getBus();
    bus.publish(1, { type: "connected" });

    await vi.waitFor(() => {
      expect(publishMock).toHaveBeenCalled();
    });
  });
});
