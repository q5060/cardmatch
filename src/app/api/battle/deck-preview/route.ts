import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getDeckDisclosedViaMatch,
  getDeckDisclosedViaSpot,
} from "@/lib/deckDisclosure";

/**
 * @route GET /api/battle/deck-preview
 * @description View cards for a deck disclosed via battle announcement or match invite.
 * @query deckId (required), spotId OR matchId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const deckId = searchParams.get("deckId")?.trim();
    const spotId = searchParams.get("spotId")?.trim();
    const matchIdRaw = searchParams.get("matchId")?.trim();

    if (!deckId) {
      return NextResponse.json({ error: "Missing deckId" }, { status: 400 });
    }

    let preview = null;
    if (spotId) {
      preview = await getDeckDisclosedViaSpot(
        deckId,
        spotId,
        session.userId,
      );
    } else if (matchIdRaw) {
      const matchId = parseInt(matchIdRaw, 10);
      if (Number.isNaN(matchId)) {
        return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
      }
      preview = await getDeckDisclosedViaMatch(
        deckId,
        matchId,
        session.userId,
      );
    } else {
      return NextResponse.json(
        { error: "Missing spotId or matchId" },
        { status: 400 },
      );
    }

    if (!preview) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (!preview.canViewCards) {
      return NextResponse.json(
        { error: "此牌組內容未公開" },
        { status: 403 },
      );
    }

    return NextResponse.json(preview);
  } catch (error) {
    console.error("deck-preview error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
