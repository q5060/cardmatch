import { ImageResponse } from "next/og";
import type { MatchSharePayload } from "@/lib/matchShare";
import {
  fetchAvatarDataUrl,
  getWinnerDisplayName,
  formatMatchShareDate,
  resolveSiteOrigin,
} from "@/lib/matchShare";

export const OG_SIZE = { width: 1200, height: 630 };

export async function renderMatchShareOgImage(
  share: MatchSharePayload,
): Promise<ImageResponse> {
  const origin = resolveSiteOrigin();
  const [avatarA, avatarB] = await Promise.all([
    fetchAvatarDataUrl(share.playerA.avatarUrl, origin),
    fetchAvatarDataUrl(share.playerB.avatarUrl, origin),
  ]);

  const aWins = share.winnerId === share.playerA.id;
  const bWins = share.winnerId === share.playerB.id;
  const outcome = getWinnerDisplayName(share);
  const when = formatMatchShareDate(share.completedAt);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 45%, #f4f4f5 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "36px 48px 24px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 22, color: "#14b8a6", fontWeight: 700, letterSpacing: 4 }}>
            CARDMATCH
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#171717", marginTop: 8 }}>
            對戰結果
          </div>
          <div style={{ fontSize: 28, color: "#0d9488", fontWeight: 600, marginTop: 12 }}>
            {outcome}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            padding: "24px 48px",
          }}
        >
          <PlayerOgBlock
            name={share.playerA.displayName}
            avatar={avatarA}
            isWinner={aWins}
          />
          <div style={{ fontSize: 32, fontWeight: 700, color: "#a3a3a3" }}>VS</div>
          <PlayerOgBlock
            name={share.playerB.displayName}
            avatar={avatarB}
            isWinner={bWins}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "20px 48px 36px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            fontSize: 24,
            color: "#525252",
          }}
        >
          <div style={{ display: "flex" }}>📍 {share.meetLabel}</div>
          <div style={{ display: "flex" }}>🕐 {when}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}

function PlayerOgBlock({
  name,
  avatar,
  isWinner,
}: {
  name: string;
  avatar: string | null;
  isWinner: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        borderRadius: 24,
        border: isWinner ? "3px solid #14b8a6" : "2px solid rgba(0,0,0,0.08)",
        background: isWinner ? "rgba(20,184,166,0.1)" : "rgba(255,255,255,0.9)",
        minWidth: 320,
      }}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires img
        <img
          src={avatar}
          alt=""
          width={120}
          height={120}
          style={{ borderRadius: 60, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            background: "#e5e5e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            color: "#a3a3a3",
          }}
        >
          ?
        </div>
      )}
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "#171717",
          marginTop: 16,
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: isWinner ? "#0d9488" : "#737373",
          marginTop: 8,
        }}
      >
        {isWinner ? "勝方" : "敗方"}
      </div>
    </div>
  );
}
