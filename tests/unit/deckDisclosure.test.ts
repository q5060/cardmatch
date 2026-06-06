import { describe, expect, it } from "vitest";
import { countDeckCards, parseDeckCards } from "@/lib/matchDeck";

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

describe("countDeckCards", () => {
  it("sums card counts instead of counting unique entries", () => {
    const total = countDeckCards(
      JSON.stringify([
        { id: 1, name: "Pika", count: 4 },
        { id: 2, name: "Raichu", count: 2 },
        { id: 3, name: "Energy", count: 10 },
      ]),
    );
    expect(total).toBe(16);
  });

  it("returns 0 for empty or invalid deckJson", () => {
    expect(countDeckCards(null)).toBe(0);
    expect(countDeckCards("not json")).toBe(0);
  });
});
