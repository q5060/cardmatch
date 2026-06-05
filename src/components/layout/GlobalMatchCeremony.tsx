"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, rejectInvite } from "@/actions/match";
import { BattleCeremonyOverlay } from "@/components/battle/BattleCeremonyOverlay";
import {
  useMatchCeremony,
  type CeremonyState,
} from "@/hooks/useMatchCeremony";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import type { RealtimeEvent } from "@/lib/realtime/types";
import type { ActiveMatchDTO } from "@/lib/matchDto";
import { MATCH_STATUS } from "@/lib/constants";
import { prefersReducedMotion } from "@/lib/motion";

function buildIncomingInviteCeremony(
  match: ActiveMatchDTO,
  userId: number,
): CeremonyState {
  const opponent =
    match.playerAId === userId ? match.playerB : match.playerA;
  return {
    kind: "incoming_invite",
    matchId: match.id,
    reducedMotion: prefersReducedMotion(),
    opponentId: opponent.id,
    opponentName: opponent.displayName,
    opponentAvatarUrl: opponent.avatarUrl ?? null,
    opponentGender: opponent.gender,
    opponentAge: opponent.age,
    meetLabel: match.meetLabel,
  };
}

export function GlobalMatchCeremony({ userId }: { userId: number }) {
  const router = useRouter();
  const [activeMatch, setActiveMatch] = useState<ActiveMatchDTO | null>(null);
  const [incomingCeremony, setIncomingCeremony] =
    useState<CeremonyState | null>(null);
  const prevMatchIdRef = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();

  const syncActiveMatch = useCallback(async () => {
    try {
      const res = await fetch("/api/matches/active");
      if (!res.ok) return;
      const data = (await res.json()) as { activeMatch: ActiveMatchDTO | null };
      setActiveMatch(data.activeMatch);
      prevMatchIdRef.current = data.activeMatch?.id ?? null;
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void syncActiveMatch();
  }, [syncActiveMatch]);

  const onMatchUpdated = useCallback(
    (e: RealtimeEvent) => {
      if (e.type !== "match.updated") return;
      const next = e.activeMatch;
      const prevId = prevMatchIdRef.current;
      prevMatchIdRef.current = next?.id ?? null;
      setActiveMatch(next);

      if (
        next?.status === MATCH_STATUS.INVITE_PENDING &&
        next.invitedById !== userId &&
        prevId !== next.id
      ) {
        setIncomingCeremony(buildIncomingInviteCeremony(next, userId));
      }

      if (next?.status !== MATCH_STATUS.INVITE_PENDING) {
        setIncomingCeremony(null);
      }
    },
    [userId],
  );

  const onMatchCompleted = useCallback((e: RealtimeEvent) => {
    if (e.type !== "match.completed") return;
    prevMatchIdRef.current = null;
    setActiveMatch(null);
    setIncomingCeremony(null);
  }, []);

  useRealtimeEvent((ev) => ev.type === "match.updated", onMatchUpdated);
  useRealtimeEvent((ev) => ev.type === "match.completed", onMatchCompleted);

  const { ceremony: transitionCeremony, dismissCeremony } = useMatchCeremony(
    activeMatch,
    userId,
    undefined,
    { skipKinds: ["incoming_invite"] },
  );

  const ceremony = incomingCeremony ?? transitionCeremony;

  const dismiss = useCallback(() => {
    setIncomingCeremony(null);
    dismissCeremony();
  }, [dismissCeremony]);

  useEffect(() => {
    if (ceremony?.kind !== "incoming_invite") return;
    document.title = "（新邀請）CardMatch";
    return () => {
      document.title = "CardMatch";
    };
  }, [ceremony?.kind]);

  if (!ceremony || !activeMatch || ceremony.matchId !== activeMatch.id) {
    return null;
  }

  function run(action: () => Promise<unknown>) {
    startTransition(() => {
      void action();
    });
  }

  return (
    <BattleCeremonyOverlay
      key={`${ceremony.matchId}-${ceremony.kind}`}
      ceremony={ceremony}
      onDismiss={dismiss}
      inviteActions={
        ceremony.kind === "incoming_invite" ? (
          <>
            <button
              type="button"
              data-testid="accept-invite"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await acceptInvite(activeMatch.id.toString());
                  dismiss();
                  router.push("/battle");
                })
              }
              className="btn btn-primary min-w-[7rem]"
            >
              接受約戰
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await rejectInvite(activeMatch.id.toString());
                  dismiss();
                })
              }
              className="btn btn-outline border-red-200 font-semibold text-red-700 hover:bg-red-50"
            >
              拒絕
            </button>
          </>
        ) : undefined
      }
    />
  );
}
