"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Swords, UserRound, X } from "lucide-react";
import type { CeremonyState } from "@/hooks/useMatchCeremony";
import { PlayerIdentificationBlock } from "@/components/profile/PlayerIdentificationBlock";

const BATTLE_START_MS = 1200;
const INVITE_ACCEPTED_MS = 2500;

type Props = {
  ceremony: CeremonyState;
  onDismiss: () => void;
  inviteActions?: React.ReactNode;
};

function PlayerAvatar({
  name,
  avatarUrl,
  size = "lg",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "lg" | "md";
}) {
  const dim = size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const icon = size === "lg" ? "h-8 w-8" : "h-6 w-6";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${name}的頭像`}
        width={size === "lg" ? 64 : 48}
        height={size === "lg" ? 64 : 48}
        className={`${dim} rounded-full object-cover ring-4 ring-white shadow-md`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full bg-primary/15 ring-4 ring-white shadow-md`}
      aria-hidden
    >
      <UserRound className={`${icon} text-primary`} strokeWidth={1.5} />
    </div>
  );
}

function subscribeClientMounted(cb: () => void) {
  cb();
  return () => {};
}

function getClientMounted() {
  return true;
}

function getServerMounted() {
  return false;
}

export function BattleCeremonyOverlay({ ceremony, onDismiss, inviteActions }: Props) {
  const mounted = useSyncExternalStore(
    subscribeClientMounted,
    getClientMounted,
    getServerMounted,
  );
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (ceremony.kind !== "battle_start" && ceremony.kind !== "invite_accepted") {
      return;
    }

    const duration =
      ceremony.kind === "battle_start"
        ? ceremony.reducedMotion
          ? 400
          : BATTLE_START_MS
        : ceremony.reducedMotion
          ? 800
          : INVITE_ACCEPTED_MS;

    const exitLead = ceremony.reducedMotion ? 0 : 280;
    const timer = window.setTimeout(() => {
      if (!ceremony.reducedMotion) {
        setExiting(true);
        window.setTimeout(onDismiss, exitLead);
      } else {
        onDismiss();
      }
    }, duration - exitLead);

    return () => window.clearTimeout(timer);
  }, [ceremony, onDismiss]);

  if (!mounted) return null;

  const motionClass = ceremony.reducedMotion ? "" : "ceremony-content-pop";

  if (ceremony.kind === "invite_accepted") {
    return createPortal(
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-[1100] flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] ${
          exiting ? "ceremony-toast-exit" : "ceremony-toast-enter"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="card flex max-w-md items-center gap-3 border border-primary/25 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Swords className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">對方已接受約戰</p>
            <p className="text-xs text-muted-foreground truncate">{ceremony.opponentName}</p>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (ceremony.kind === "battle_start") {
    return createPortal(
      <div
        className={`fixed inset-0 z-[1100] flex min-h-dvh items-center justify-center bg-black/55 px-6 ${
          exiting ? "ceremony-overlay-exit" : "ceremony-overlay-enter"
        }`}
        role="alert"
        aria-live="assertive"
        aria-label="對戰開始"
      >
        <div
          className={`flex flex-col items-center text-center text-white ${motionClass}`}
        >
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 ${ceremony.reducedMotion ? "" : "motion-sword-tilt"}`}
          >
            <Swords className="h-10 w-10 text-white" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">對戰開始！</p>
          <p className="mt-3 text-lg text-white/90">vs {ceremony.opponentName}</p>
          <p className="mt-1 max-w-xs text-sm text-white/70">{ceremony.meetLabel}</p>
        </div>
      </div>,
      document.body,
    );
  }

  const profileHref = `/profile/${ceremony.opponentId}`;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1100] flex min-h-dvh items-center justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] ${
        exiting ? "ceremony-overlay-exit" : "ceremony-overlay-enter"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ceremony-invite-title"
    >
      <div
        className={`card w-full max-w-md p-6 shadow-xl ${motionClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">新約戰邀請</p>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
            aria-label="關閉"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <h2 id="ceremony-invite-title" className="text-center text-lg font-bold text-foreground">
            新約戰邀請
          </h2>
          <PlayerIdentificationBlock
            player={{
              displayName: ceremony.opponentName,
              avatarUrl: ceremony.opponentAvatarUrl,
              gender: ceremony.opponentGender,
              age: ceremony.opponentAge,
            }}
          />
          <p className="text-center text-sm font-medium text-foreground">{ceremony.meetLabel}</p>
          <div className="flex justify-center">
            <Link
              href={profileHref}
              className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              查看個人檔案
            </Link>
          </div>
        </div>

        {inviteActions ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">{inviteActions}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
