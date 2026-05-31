import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { DECK_VISIBILITY } from "@/lib/constants";

// Helper function to check if two users are friends
async function areFriends(userId1: number, userId2: number): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
      status: "ACCEPTED",
    },
  });
  return !!friendship;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const viewOnly = searchParams.get("viewOnly") === "true";

    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const deck = await prisma.deck.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        notes: true,
        visibility: true,
        deckJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!deck) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // If viewing own deck
    if (deck.userId === session.userId) {
      return NextResponse.json(deck);
    }

    // If viewing other's deck, check visibility permissions
    if (viewOnly) {
      // Check visibility settings
      if (deck.visibility === DECK_VISIBILITY.PRIVATE) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      if (deck.visibility === DECK_VISIBILITY.FRIENDS) {
        const isFriend = await areFriends(deck.userId, session.userId);
        if (!isFriend) {
          return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
        }
      }

      // Return deck with deckJson for view-only mode
      return NextResponse.json(deck);
    }

    // Default: Only owner can edit
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  } catch (error) {
    console.error("Error fetching deck:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * @route DELETE /api/decks/[id]
 * @description Delete a deck (only by owner)
 * @returns { success: boolean }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Verify deck ownership
    const deck = await prisma.deck.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!deck) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (deck.userId !== session.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Delete the deck (and all related cards via cascade)
    await prisma.deck.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deck:", error);
    return NextResponse.json(
      { error: "Failed to delete deck" },
      { status: 500 }
    );
  }
}


// 2. 新增 PATCH 方法處理牌組儲存請求
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 解析 JSON body
    const body = await req.json();
    const { deckJson } = body;

    if (deckJson === undefined) {
      return NextResponse.json({ error: "Missing deckJson" }, { status: 400 });
    }

    // 更新資料庫
    const updatedDeck = await prisma.deck.update({
      where: {
        id: id,
        userId: session.userId, // 確保使用者只能更新自己的牌組
      },
      data: {
        deckJson: deckJson,
      },
    });

    return NextResponse.json({ success: true, deck: updatedDeck });
  } catch (error) {
    console.error("Error updating deck composition:", error);
    return NextResponse.json(
      { error: "Failed to update deck" },
      { status: 500 }
    );
  }
}
