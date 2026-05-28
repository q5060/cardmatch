import type { ActiveMatchDTO, BattleResultDTO } from "@/lib/matchDto";

export type ChatMessageDTO = {
  id: string;
  senderId: number;
  body: string;
  createdAt: string;
  sender: { id: number; displayName: string };
};

export type RealtimeEvent =
  | { type: "connected" }
  | {
      type: "match.updated";
      matchId: number;
      activeMatch: ActiveMatchDTO | null;
      battleResult: BattleResultDTO;
    }
  | {
      type: "message.new";
      channel: "match";
      matchId: number;
      message: ChatMessageDTO;
    }
  | {
      type: "message.new";
      channel: "friend";
      friendshipId: string;
      message: ChatMessageDTO;
    }
  | { type: "notification.new"; unreadCount: number };

export type RealtimeEnqueue = (event: RealtimeEvent) => void;

export type RealtimeSubscription = {
  unsubscribe: () => void;
};
