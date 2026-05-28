import type { RealtimeBus } from "./bus";
import { getMemoryBus } from "./memoryBus";
import { getRedisBus } from "./redisBus";

export function getBus(): RealtimeBus {
  const mode = process.env.REALTIME_BUS ?? "memory";

  if (mode === "redis") {
    if (!process.env.REDIS_URL) {
      throw new Error("REALTIME_BUS=redis requires REDIS_URL");
    }
    return getRedisBus();
  }

  return getMemoryBus();
}
