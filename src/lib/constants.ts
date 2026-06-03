export const DECK_VISIBILITY = {
  PUBLIC: "PUBLIC",
  FRIENDS: "FRIENDS",
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

/** At most one match per user in these statuses (enforced in server actions). */
export const MATCH_ACTIVE_STATUSES: MatchStatus[] = [
  MATCH_STATUS.INVITE_PENDING,
  MATCH_STATUS.ACCEPTED,
  MATCH_STATUS.IN_PROGRESS,
];

/** Match chat API aligns with UI: only after invite accepted. */
export const MATCH_CHAT_ALLOWED_STATUSES: MatchStatus[] = [
  MATCH_STATUS.ACCEPTED,
  MATCH_STATUS.IN_PROGRESS,
];

export const FRIENDSHIP_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
} as const;

/** Default hours until a battle announcement expires. */
export const ANNOUNCEMENT_TTL_DEFAULT_HOURS = 4;
/** @deprecated Use ANNOUNCEMENT_TTL_DEFAULT_HOURS */
export const ANNOUNCEMENT_TTL_HOURS = ANNOUNCEMENT_TTL_DEFAULT_HOURS;
export const ANNOUNCEMENT_TTL_MIN_HOURS = 1;
export const ANNOUNCEMENT_TTL_MAX_HOURS = 24;

/** Max completed matches shown on profile overview. */
export const PROFILE_RECENT_MATCHES = 3;
/** Max matches loaded on profile all-matches page. */
export const PROFILE_ALL_MATCHES = 100;

/** How long a random-match queue entry stays valid (ms). */
export const MATCH_QUEUE_TTL_MS = 30 * 60 * 1000;

export const BATTLE_OUTCOME = {
  WIN: "WIN",
  LOSS: "LOSS",
  DRAW: "DRAW",
} as const;

/** Profile gender — validate with isUserGender in lib/profile.ts */
export const USER_GENDER = {
  MALE: "MALE",
  FEMALE: "FEMALE",
} as const;

export type UserGender = (typeof USER_GENDER)[keyof typeof USER_GENDER];

/** Profile age bounds (exact years). */
export const USER_AGE_MIN = 13;
export const USER_AGE_MAX = 120;
