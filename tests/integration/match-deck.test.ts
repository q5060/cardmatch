import { beforeEach, describe, expect, it } from "vitest";
import { createInviteMatch } from "@/lib/matchInvite";
import { acceptInviteForUser, setReadyForUser } from "@/lib/matchLifecycle";
import { setMatchDeck } from "@/actions/match";
import { getDeckDisclosedViaSpot } from "@/lib/deckDisclosure";
import { fetchActiveMatchPayload } from "@/lib/matchDto";
import { getMapAnnouncements } from "@/lib/queries";
import { clearTestCookies } from "../helpers/auth";
import { createLookingMeetSpot, createUser, resetTables, testPrisma } from "../helpers/db";
import { loginAsUser } from "../helpers/session";
import { MATCH_STATUS } from "@/lib/constants";

const meet = {
  lat: 25.033,
  lng: 121.565,
  label: "測試地點",
  shopId: null as string | null,
};

describe("match deck selection", () => {
  beforeEach(async () => {
    clearTestCookies();
    await resetTables();
  });

  it("discloses private announcement decks to other players", async () => {
    const [publisher, viewer] = await Promise.all([
      createUser({
        email: "pub@example.com",
        password: "password12",
        displayName: "Pub",
      }),
      createUser({
        email: "viewer@example.com",
        password: "password12",
        displayName: "Viewer",
      }),
    ]);

    const deck = await testPrisma.deck.create({
      data: {
        userId: publisher.id,
        title: "Secret Deck",
        visibility: "PRIVATE",
        deckJson: JSON.stringify([{ id: 1, name: "Card", count: 1 }]),
      },
    });

    const spot = await createLookingMeetSpot(publisher.id);
    await testPrisma.meetSpot.update({
      where: { id: spot.id },
      data: { deckId: deck.id },
    });

    const announcements = await getMapAnnouncements(viewer.id);
    const ann = announcements.find((a) => a.spotId === spot.id);
    expect(ann?.deck?.canViewCards).toBe(true);

    const preview = await getDeckDisclosedViaSpot(deck.id, spot.id);
    expect(preview?.canViewCards).toBe(true);
    expect(preview?.cards).toHaveLength(1);
  });

  it("discloses private invite decks to the opponent in active matches", async () => {
    const [publisher, inviter] = await Promise.all([
      createUser({
        email: "pub2@example.com",
        password: "password12",
        displayName: "Pub2",
      }),
      createUser({
        email: "inv2@example.com",
        password: "password12",
        displayName: "Inv2",
      }),
    ]);

    const invDeck = await testPrisma.deck.create({
      data: {
        userId: inviter.id,
        title: "Inv Private Deck",
        visibility: "PRIVATE",
        deckJson: JSON.stringify([{ id: 2, name: "Hidden", count: 1 }]),
      },
    });

    await createInviteMatch({
      inviterId: inviter.id,
      targetUserId: publisher.id,
      meet,
      source: "spot",
      publisherId: publisher.id,
      inviterDeckId: invDeck.id,
    });

    const payload = await fetchActiveMatchPayload(publisher.id);
    expect(payload.activeMatch?.theirDeck?.canViewCards).toBe(true);
    expect(payload.activeMatch?.theirDeck?.cards).toHaveLength(1);
  });

  it("copies announcement deck to publisher and inviter deck on invite", async () => {
    const [publisher, inviter] = await Promise.all([
      createUser({
        email: "pub@example.com",
        password: "password12",
        displayName: "Pub",
      }),
      createUser({
        email: "inv@example.com",
        password: "password12",
        displayName: "Inv",
      }),
    ]);

    const pubDeck = await testPrisma.deck.create({
      data: {
        userId: publisher.id,
        title: "Pub Deck",
        visibility: "PUBLIC",
      },
    });
    const invDeck = await testPrisma.deck.create({
      data: {
        userId: inviter.id,
        title: "Inv Deck",
        visibility: "PRIVATE",
      },
    });

    await testPrisma.meetSpot.create({
      data: {
        userId: publisher.id,
        lat: 25,
        lng: 121,
        label: "Shop",
        looking: true,
        active: true,
        expiresAt: new Date(Date.now() + 3600_000),
        deckId: pubDeck.id,
      },
    });

    const match = await createInviteMatch({
      inviterId: inviter.id,
      targetUserId: publisher.id,
      meet,
      source: "spot",
      publisherId: publisher.id,
      publisherDeckId: pubDeck.id,
      inviterDeckId: invDeck.id,
    });

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    const publisherIsA = publisher.id < inviter.id;
    if (publisherIsA) {
      expect(row?.playerADeckId).toBe(pubDeck.id);
      expect(row?.playerBDeckId).toBe(invDeck.id);
    } else {
      expect(row?.playerBDeckId).toBe(pubDeck.id);
      expect(row?.playerADeckId).toBe(invDeck.id);
    }
  });

  it("blocks setMatchDeck when player is ready", async () => {
    const [a, b] = await Promise.all([
      createUser({
        email: "a@example.com",
        password: "password12",
        displayName: "A",
      }),
      createUser({
        email: "b@example.com",
        password: "password12",
        displayName: "B",
      }),
    ]);
    const deckA = await testPrisma.deck.create({
      data: { userId: a.id, title: "A Deck", visibility: "PUBLIC" },
    });

    const match = await createInviteMatch({
      inviterId: a.id,
      targetUserId: b.id,
      meet,
      source: "spot",
      publisherId: b.id,
    });
    await acceptInviteForUser(match.id, b.id);
    await setReadyForUser(match.id, a.id, true);

    await loginAsUser("a@example.com");
    await expect(setMatchDeck(match.id.toString(), deckA.id)).rejects.toThrow(
      /已準備/,
    );
  });

  it("allows setMatchDeck after cancel ready", async () => {
    const [a, b] = await Promise.all([
      createUser({
        email: "a2@example.com",
        password: "password12",
        displayName: "A2",
      }),
      createUser({
        email: "b2@example.com",
        password: "password12",
        displayName: "B2",
      }),
    ]);
    const deckA = await testPrisma.deck.create({
      data: { userId: a.id, title: "A2 Deck", visibility: "PUBLIC" },
    });

    const match = await createInviteMatch({
      inviterId: a.id,
      targetUserId: b.id,
      meet,
      source: "spot",
      publisherId: b.id,
    });
    await acceptInviteForUser(match.id, b.id);
    await setReadyForUser(match.id, a.id, true);
    await setReadyForUser(match.id, a.id, false);

    await loginAsUser("a2@example.com");
    await setMatchDeck(match.id.toString(), deckA.id);

    const row = await testPrisma.match.findUnique({ where: { id: match.id } });
    expect(row?.status).toBe(MATCH_STATUS.ACCEPTED);
    const aIsPlayerA = a.id < b.id;
    expect(aIsPlayerA ? row?.playerADeckId : row?.playerBDeckId).toBe(deckA.id);
  });
});
