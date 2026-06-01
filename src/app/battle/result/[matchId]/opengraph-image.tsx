import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getMatchSharePayload } from "@/lib/matchShare";
import { OG_SIZE, renderMatchShareOgImage } from "@/lib/matchShareOg";

export const runtime = "nodejs";
export const alt = "CardMatch 對戰結果";
export const size = OG_SIZE;
export const contentType = "image/png";

type Props = { params: Promise<{ matchId: string }> };

export default async function OpenGraphImage({ params }: Props) {
  const { matchId: idStr } = await params;
  const matchId = parseInt(idStr, 10);
  if (Number.isNaN(matchId)) notFound();

  const share = await getMatchSharePayload(matchId);
  if (!share) notFound();

  return renderMatchShareOgImage(share);
}
