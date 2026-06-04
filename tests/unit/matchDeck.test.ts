import { describe, expect, it } from "vitest";
import { deckIdsForInviteMatch } from "@/lib/matchDeck";

describe("deckIdsForInviteMatch", () => {
  it("assigns publisher and inviter decks to correct player slots", () => {
    const result = deckIdsForInviteMatch({
      playerAId: 10,
      playerBId: 20,
      publisherId: 20,
      inviterId: 10,
      publisherDeckId: "pub-deck",
      inviterDeckId: "inv-deck",
    });
    expect(result).toEqual({
      playerADeckId: "inv-deck",
      playerBDeckId: "pub-deck",
    });
  });

  it("returns null when no decks selected", () => {
    const result = deckIdsForInviteMatch({
      playerAId: 1,
      playerBId: 2,
      publisherId: 2,
      inviterId: 1,
      publisherDeckId: null,
      inviterDeckId: null,
    });
    expect(result).toEqual({
      playerADeckId: null,
      playerBDeckId: null,
    });
  });
});
