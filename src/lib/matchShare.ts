import prisma from "@/lib/prisma";
import { MATCH_STATUS } from "@/lib/constants";
import {
  getMatchDeckSidesForViewer,
  matchDeckInclude,
  type DeckSummaryWithCards,
} from "@/lib/matchDeck";
import {
  resolveMatchPlayerNote,
  type MatchSharePlayerNote,
} from "@/lib/matchNotes";
import { readFile } from "fs/promises";
import path from "path";

export type { MatchSharePlayerNote };

export type MatchSharePlayer = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  deck: DeckSummaryWithCards | null;
  note?: MatchSharePlayerNote | null;
};

export type MatchSharePayload = {
  matchId: number;
  completedAt: string;
  meetLabel: string;
  winnerId: number | null;
  playerA: MatchSharePlayer;
  playerB: MatchSharePlayer;
};

export type FinishMatchResult =
  | { completed: false }
  | { completed: true; share: MatchSharePayload };

export function resolveSiteOrigin(origin?: string): string {
  if (origin) return origin.replace(/\/$/, "");
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function buildShareUrl(matchId: number, origin?: string): string {
  return `${resolveSiteOrigin(origin)}/battle/result/${matchId}`;
}

export async function getMatchSharePayload(
  matchId: number,
  viewerId?: number | null,
): Promise<MatchSharePayload | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      playerA: { select: { id: true, displayName: true, avatarUrl: true } },
      playerB: { select: { id: true, displayName: true, avatarUrl: true } },
      battleResults: true,
      ...matchDeckInclude,
    },
  });

  if (!match || match.status !== MATCH_STATUS.COMPLETED) return null;

  const br = match.battleResults[0];
  if (!br || br.status !== "AGREED") return null;

  const decks = await getMatchDeckSidesForViewer(match, viewerId ?? null, {
    bypassVisibilityForParticipant: true,
  });
  const viewerCanEditA =
    viewerId !== null && viewerId !== undefined && match.playerAId === viewerId;
  const viewerCanEditB =
    viewerId !== null && viewerId !== undefined && match.playerBId === viewerId;

  const [noteA, noteB] = await Promise.all([
    resolveMatchPlayerNote({
      ownerId: match.playerAId,
      viewerId: viewerId ?? null,
      notes: br.playerANotes,
      visibility: br.playerANotesVisibility,
      canEdit: viewerCanEditA,
    }),
    resolveMatchPlayerNote({
      ownerId: match.playerBId,
      viewerId: viewerId ?? null,
      notes: br.playerBNotes,
      visibility: br.playerBNotesVisibility,
      canEdit: viewerCanEditB,
    }),
  ]);

  return {
    matchId: match.id,
    completedAt: match.updatedAt.toISOString(),
    meetLabel: match.meetLabel,
    winnerId: br.winnerId,
    playerA: { ...match.playerA, deck: decks.playerA, note: noteA },
    playerB: { ...match.playerB, deck: decks.playerB, note: noteB },
  };
}

export function formatMatchShareDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  });
}

export function getWinnerDisplayName(share: MatchSharePayload): string {
  if (share.winnerId === null) return "平手";
  const winner =
    share.winnerId === share.playerA.id ? share.playerA : share.playerB;
  return `${winner.displayName} 獲勝`;
}

/** Winner line on result card: always「{displayName} 獲勝」or 平手. */
export function getWinnerLabelForViewer(share: MatchSharePayload): string {
  return getWinnerDisplayName(share);
}

export function buildSharePostText(share: MatchSharePayload): string {
  const outcome = getWinnerDisplayName(share);
  return `CardMatch 對戰結果：${share.playerA.displayName} vs ${share.playerB.displayName}，${outcome} · ${share.meetLabel}`;
}

/** Full text for clipboard when Facebook cannot pre-fill the composer. */
export function buildShareClipboardText(
  share: MatchSharePayload,
  shareUrl: string,
): string {
  return `${buildSharePostText(share)}\n${shareUrl}`;
}

/** @deprecated Use buildSharePostText */
export function buildShareTweetText(share: MatchSharePayload): string {
  return buildSharePostText(share);
}

export function buildTwitterShareUrl(shareUrl: string, text: string): string {
  return `https://twitter.com/intent/tweet?${new URLSearchParams({ url: shareUrl, text }).toString()}`;
}

export function buildFacebookShareUrl(shareUrl: string, quote: string): string {
  return `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({
    u: shareUrl,
    quote,
  }).toString()}`;
}

export function buildThreadsShareUrl(shareUrl: string, text: string): string {
  const body = `${text}\n${shareUrl}`;
  return `https://www.threads.net/intent/post?${new URLSearchParams({ text: body }).toString()}`;
}

export async function fetchAvatarDataUrl(
  avatarUrl: string | null,
  siteOrigin: string,
): Promise<string | null> {
  if (!avatarUrl) return null;

  // Stored inline by /api/auth/update-profile; safe to pass through to ImageResponse.
  if (avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }

  if (avatarUrl.startsWith("/api/avatar/")) {
    try {
      const match = avatarUrl.match(/\/api\/avatar\/(\d+)/);
      if (match) {
        const userId = parseInt(match[1], 10);
        const avatar = await prisma.avatar.findUnique({
          where: { userId },
          select: { data: true, mimeType: true },
        });
        if (avatar) {
          const base64 = avatar.data.toString("base64");
          return `data:${avatar.mimeType};base64,${base64}`;
        }
      }
    } catch {
      // fallback to fetch
    }
  }


  const url = avatarUrl.startsWith("http")
    ? avatarUrl
    : `${siteOrigin}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(buf).toString("base64");
    return `data:${type};base64,${base64}`;
  } catch {
    return null;
  }
}
