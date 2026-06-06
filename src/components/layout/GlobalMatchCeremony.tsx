"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { acceptInvite, rejectInvite } from "@/actions/match";
import { BattleCeremonyOverlay } from "@/components/battle/BattleCeremonyOverlay";
import {
  useMatchCeremony,
  type CeremonyState,
} from "@/hooks/useMatchCeremony";
import {
  useRealtimeConnected,
  useRealtimeEvent,
} from "@/hooks/useRealtimeEvent";
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

function initialIncomingCeremony(
  match: ActiveMatchDTO | null,
  userId: number,
): CeremonyState | null {
  if (
    match?.status === MATCH_STATUS.INVITE_PENDING &&
    match.invitedById !== userId
  ) {
    return buildIncomingInviteCeremony(match, userId);
  }
  return null;
}

async function fetchActiveMatch(): Promise<ActiveMatchDTO | null> {
  try {
    const res = await fetch("/api/matches/active");
    if (!res.ok) return null;
    const data = (await res.json()) as { activeMatch: ActiveMatchDTO | null };
    return data.activeMatch;
  } catch {
    return null;
  }
}

export function GlobalMatchCeremony({
  userId,
  initialActiveMatch = null,
}: {
  userId: number;
  initialActiveMatch?: ActiveMatchDTO | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeMatch, setActiveMatch] = useState<ActiveMatchDTO | null>(
    initialActiveMatch,
  );
  const [incomingCeremony, setIncomingCeremony] = useState<CeremonyState | null>(
    () => initialIncomingCeremony(initialActiveMatch, userId),
  );
  const prevMatchIdRef = useRef<number | null>(initialActiveMatch?.id ?? null);
  const dismissedInviteIdsRef = useRef(new Set<number>());
  const [pending, startTransition] = useTransition();
  const sseConnected = useRealtimeConnected();

  const applyActiveMatch = useCallback(
    (next: ActiveMatchDTO | null) => {
      const prevId = prevMatchIdRef.current;
      prevMatchIdRef.current = next?.id ?? null;
      setActiveMatch(next);

      if (
        next?.status === MATCH_STATUS.INVITE_PENDING &&
        next.invitedById !== userId &&
        prevId !== next.id &&
        !dismissedInviteIdsRef.current.has(next.id)
      ) {
        setIncomingCeremony(buildIncomingInviteCeremony(next, userId));
      }

      if (next?.status !== MATCH_STATUS.INVITE_PENDING) {
        setIncomingCeremony(null);
      }
    },
    [userId],
  );

  const syncActiveMatch = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const next = await fetchActiveMatch();
    applyActiveMatch(next);
  }, [applyActiveMatch]);

  const onMatchUpdated = useCallback(
    (e: RealtimeEvent) => {
      if (e.type !== "match.updated") return;
      applyActiveMatch(e.activeMatch);
    },
    [applyActiveMatch],
  );

  const onMatchCompleted = useCallback(
    (e: RealtimeEvent) => {
      if (e.type !== "match.completed") return;
      prevMatchIdRef.current = null;
      setActiveMatch(null);
      setIncomingCeremony(null);
    },
    [],
  );

  const onNotification = useCallback(
    (e: RealtimeEvent) => {
      if (e.type !== "notification.new") return;
      void syncActiveMatch();
    },
    [syncActiveMatch],
  );

  useRealtimeEvent((ev) => ev.type === "match.updated", onMatchUpdated);
  useRealtimeEvent((ev) => ev.type === "match.completed", onMatchCompleted);
  useRealtimeEvent((e) => e.type === "notification.new", onNotification);

  /** Poll active match when SSE is disconnected (invite popup fallback). */
  useEffect(() => {
    if (sseConnected) return;
    const id = window.setInterval(() => {
      void syncActiveMatch();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [sseConnected, syncActiveMatch]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") void syncActiveMatch();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [syncActiveMatch]);

  const { ceremony: transitionCeremony, dismissCeremony } = useMatchCeremony(
    activeMatch,
    userId,
    undefined,
    { skipKinds: ["incoming_invite"] },
  );

  const ceremony = incomingCeremony ?? transitionCeremony;

  const dismiss = useCallback(() => {
    if (incomingCeremony?.matchId != null) {
      dismissedInviteIdsRef.current.add(incomingCeremony.matchId);
    }
    setIncomingCeremony(null);
    dismissCeremony();
  }, [dismissCeremony, incomingCeremony?.matchId]);

  useEffect(() => {
    if (ceremony?.kind !== "incoming_invite") return;
    document.title = "（新邀請）CardMatch";
    return () => {
      document.title = "CardMatch";
    };
  }, [ceremony?.kind]);

  if (
    !ceremony ||
    !activeMatch ||
    ceremony.matchId !== activeMatch.id ||
    (pathname === "/battle" && ceremony.kind === "incoming_invite")
  ) {
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
