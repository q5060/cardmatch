export const DECK_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
} as const;

export const MATCH_STATUS = {
  INVITE_PENDING: "INVITE_PENDING",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

export const FRIENDSHIP_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
} as const;

export const QUEUE_MODE = {
  PUBLIC_LOBBY: "PUBLIC_LOBBY",
  RANDOM: "RANDOM",
} as const;

export const BATTLE_OUTCOME = {
  WIN: "WIN",
  LOSS: "LOSS",
  DRAW: "DRAW",
} as const;
