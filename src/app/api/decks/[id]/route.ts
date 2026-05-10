import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

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

    // Only allow the owner to view
    if (deck.userId !== session.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json(deck);
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
