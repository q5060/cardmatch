"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { ActiveMatchDTO } from "@/lib/matchDto";
import { MATCH_STATUS } from "@/lib/constants";
import { prefersReducedMotion } from "@/lib/motion";

export type CeremonyKind = "incoming_invite" | "invite_accepted" | "battle_start";

export type CeremonyState = {
  kind: CeremonyKind;
  matchId: number;
  reducedMotion: boolean;
  opponentId: number;
  opponentName: string;
  opponentAvatarUrl: string | null;
  meetLabel: string;
};

function ceremonyKey(matchId: number, kind: CeremonyKind) {
  return `${matchId}:${kind}`;
}

function getOpponent(match: ActiveMatchDTO, userId: number) {
  return match.playerAId === userId ? match.playerB : match.playerA;
}

type PrevSnapshot = { matchId: number; status: string } | null;

export function useMatchCeremony(
  activeMatch: ActiveMatchDTO | null,
  userId: number,
  seenInviteMatchIdRef?: MutableRefObject<number | null>,
) {
  const [ceremony, setCeremony] = useState<CeremonyState | null>(null);
  const prevRef = useRef<PrevSnapshot>(null);
  const hasHydratedRef = useRef(false);
  const shownKeysRef = useRef<Set<string>>(new Set());

  const showCeremony = useCallback(
    (kind: CeremonyKind, match: ActiveMatchDTO) => {
      const key = ceremonyKey(match.id, kind);
      if (shownKeysRef.current.has(key)) return;

      shownKeysRef.current.add(key);
      if (kind === "incoming_invite" && seenInviteMatchIdRef) {
        seenInviteMatchIdRef.current = match.id;
      }

      const opponent = getOpponent(match, userId);
      setCeremony({
        kind,
        matchId: match.id,
        reducedMotion: prefersReducedMotion(),
        opponentId: opponent.id,
        opponentName: opponent.displayName,
        opponentAvatarUrl: opponent.avatarUrl ?? null,
        meetLabel: match.meetLabel,
      });
    },
    [userId, seenInviteMatchIdRef],
  );

  const dismissCeremony = useCallback(() => {
    setCeremony(null);
  }, []);

  useEffect(() => {
    if (!activeMatch) {
      prevRef.current = null;
      return;
    }

    const { id: matchId, status, invitedById } = activeMatch;
    const prev = prevRef.current;

    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      prevRef.current = { matchId, status };
      return;
    }

    if (prev) {
      if (
        prev.status === MATCH_STATUS.ACCEPTED &&
        status === MATCH_STATUS.IN_PROGRESS
      ) {
        showCeremony("battle_start", activeMatch);
      }

      if (
        prev.status === MATCH_STATUS.INVITE_PENDING &&
        status === MATCH_STATUS.ACCEPTED &&
        invitedById === userId
      ) {
        showCeremony("invite_accepted", activeMatch);
      }

      if (
        status === MATCH_STATUS.INVITE_PENDING &&
        invitedById !== userId &&
        prev.matchId !== matchId
      ) {
        showCeremony("incoming_invite", activeMatch);
      }
    } else if (
      status === MATCH_STATUS.INVITE_PENDING &&
      invitedById !== userId
    ) {
      showCeremony("incoming_invite", activeMatch);
    }

    prevRef.current = { matchId, status };
  }, [activeMatch, userId, showCeremony]);

  return { ceremony, dismissCeremony };
}
