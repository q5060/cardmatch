import type { RealtimeBus } from "./bus";
import { getMemoryBus } from "./memoryBus";

export type { RealtimeBus } from "./bus";
export type { RealtimeEvent, RealtimeEnqueue, ChatMessageDTO } from "./types";
export {
  publishToUser,
  publishMatchSnapshot,
  publishMatchMessage,
  publishFriendMessage,
  publishNotification,
} from "./publish";

export function getBus(): RealtimeBus {
  const mode = process.env.REALTIME_BUS ?? "memory";
  if (mode === "redis") {
    throw new Error(
      "REALTIME_BUS=redis is not implemented yet. Use memory or set REALTIME_BUS=memory.",
    );
  }
  return getMemoryBus();
}
