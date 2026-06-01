import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchResultShareCard } from "@/components/battle/MatchResultShareCard";
import {
  buildShareUrl,
  getMatchSharePayload,
  getWinnerDisplayName,
} from "@/lib/matchShare";

type Props = { params: Promise<{ matchId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId: idStr } = await params;
  const matchId = parseInt(idStr, 10);
  if (Number.isNaN(matchId)) return { title: "對戰結果 | CardMatch" };

  const share = await getMatchSharePayload(matchId);
  if (!share) return { title: "對戰結果 | CardMatch" };

  const title = `${share.playerA.displayName} vs ${share.playerB.displayName} | CardMatch`;
  const description = `${getWinnerDisplayName(share)} · ${share.meetLabel}`;
  const shareUrl = buildShareUrl(matchId);
  const ogImage = `${shareUrl}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: description }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BattleResultSharePage({ params }: Props) {
  const { matchId: idStr } = await params;
  const matchId = parseInt(idStr, 10);
  if (Number.isNaN(matchId)) notFound();

  const share = await getMatchSharePayload(matchId);
  if (!share) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <MatchResultShareCard share={share} />
      <div className="flex justify-center">
        <Link href="/" className="btn btn-outline text-sm font-semibold">
          前往 CardMatch 首頁
        </Link>
      </div>
    </div>
  );
}
