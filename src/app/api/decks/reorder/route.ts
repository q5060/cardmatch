import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * @route PATCH /api/decks/reorder
 * @description Persist custom deck display order for the current user
 * @body { deckIds: string[] }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const deckIds = body?.deckIds;

    if (!Array.isArray(deckIds) || deckIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const uniqueIds = [...new Set(deckIds)] as string[];
    if (uniqueIds.length !== deckIds.length) {
      return NextResponse.json({ error: "DUPLICATE_IDS" }, { status: 400 });
    }

    const owned = await prisma.deck.findMany({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (uniqueIds.length !== owned.length) {
      return NextResponse.json({ error: "INCOMPLETE_ORDER" }, { status: 400 });
    }

    const ownedSet = new Set(owned.map((d) => d.id));
    if (!uniqueIds.every((id) => ownedSet.has(id))) {
      return NextResponse.json({ error: "INVALID_DECK" }, { status: 400 });
    }

    await prisma.$transaction(
      uniqueIds.map((id, index) =>
        prisma.deck.update({
          where: { id, userId: session.userId },
          data: { sortOrder: index },
        }),
      ),
    );

    revalidatePath("/profile");
    revalidatePath("/settings");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error reordering decks:", error);
    return NextResponse.json({ error: "Failed to reorder decks" }, { status: 500 });
  }
}
