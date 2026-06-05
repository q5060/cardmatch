import { describe, expect, it } from "vitest";
import {
  battleResultNoteUpdateData,
  getBattleResultNoteFields,
  isValidNoteVisibility,
  resolveMatchPlayerNote,
} from "@/lib/matchNotes";
import { DECK_VISIBILITY } from "@/lib/constants";

describe("matchNotes", () => {
  it("validates note visibility values", () => {
    expect(isValidNoteVisibility("PUBLIC")).toBe(true);
    expect(isValidNoteVisibility("FRIENDS")).toBe(true);
    expect(isValidNoteVisibility("PRIVATE")).toBe(true);
    expect(isValidNoteVisibility("SECRET")).toBe(false);
  });

  it("maps battle result note fields by participant", () => {
    const br = {
      playerANotes: "A note",
      playerANotesVisibility: "PUBLIC",
      playerBNotes: "B note",
      playerBNotesVisibility: "PRIVATE",
    };
    expect(getBattleResultNoteFields(br, 1, 2, 1)).toEqual({
      notes: "A note",
      visibility: "PUBLIC",
      field: "playerA",
    });
    expect(getBattleResultNoteFields(br, 1, 2, 2)).toEqual({
      notes: "B note",
      visibility: "PRIVATE",
      field: "playerB",
    });
  });

  it("builds prisma update payload per player slot", () => {
    expect(
      battleResultNoteUpdateData("playerA", "hello", DECK_VISIBILITY.FRIENDS),
    ).toEqual({
      playerANotes: "hello",
      playerANotesVisibility: DECK_VISIBILITY.FRIENDS,
    });
    expect(
      battleResultNoteUpdateData("playerB", "bye", DECK_VISIBILITY.PRIVATE),
    ).toEqual({
      playerBNotes: "bye",
      playerBNotesVisibility: DECK_VISIBILITY.PRIVATE,
    });
  });

  it("resolveMatchPlayerNote returns editable note for owner", async () => {
    const note = await resolveMatchPlayerNote({
      ownerId: 10,
      viewerId: 10,
      notes: "draft",
      visibility: DECK_VISIBILITY.PRIVATE,
      canEdit: true,
    });
    expect(note).toEqual({
      text: "draft",
      visibility: DECK_VISIBILITY.PRIVATE,
      canEdit: true,
      isHidden: false,
    });
  });

  it("resolveMatchPlayerNote hides empty notes from others", async () => {
    const note = await resolveMatchPlayerNote({
      ownerId: 10,
      viewerId: 20,
      notes: "   ",
      visibility: DECK_VISIBILITY.PUBLIC,
      canEdit: false,
    });
    expect(note).toBeNull();
  });

  it("resolveMatchPlayerNote exposes public notes to anonymous viewers", async () => {
    const note = await resolveMatchPlayerNote({
      ownerId: 10,
      viewerId: null,
      notes: "great match",
      visibility: DECK_VISIBILITY.PUBLIC,
      canEdit: false,
    });
    expect(note).toEqual({
      text: "great match",
      visibility: DECK_VISIBILITY.PUBLIC,
      canEdit: false,
      isHidden: false,
    });
  });

  it("resolveMatchPlayerNote hides private notes from others", async () => {
    const note = await resolveMatchPlayerNote({
      ownerId: 10,
      viewerId: 20,
      notes: "secret",
      visibility: DECK_VISIBILITY.PRIVATE,
      canEdit: false,
    });
    expect(note).toEqual({
      text: null,
      visibility: DECK_VISIBILITY.PRIVATE,
      canEdit: false,
      isHidden: true,
    });
  });
});
