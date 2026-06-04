import { describe, expect, it } from "vitest";
import { parseDeckCards } from "@/lib/matchDeck";

describe("parseDeckCards", () => {
  it("parses array deckJson", () => {
    const cards = parseDeckCards(
      JSON.stringify([{ id: 1, name: "Pika", count: 2 }]),
    );
    expect(cards).toHaveLength(1);
    expect(cards?.[0].name).toBe("Pika");
  });

  it("returns null for invalid json", () => {
    expect(parseDeckCards("not json")).toBeNull();
  });
});
