import prisma from "@/lib/prisma";
import { DECK_VISIBILITY } from "@/lib/constants";

export const MATCH_NOTE_MAX_LENGTH = 2000;

export type MatchSharePlayerNote = {
  text: string | null;
  visibility: string;
  canEdit: boolean;
  /** Author wrote a note but the viewer cannot read it */
  isHidden: boolean;
};

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

export async function canViewMatchNote(
  ownerId: number,
  viewerId: number | null,
  visibility: string,
): Promise<boolean> {
  if (viewerId !== null && viewerId === ownerId) return true;
  if (!viewerId) return visibility === DECK_VISIBILITY.PUBLIC;
  if (visibility === DECK_VISIBILITY.PRIVATE) return false;
  if (visibility === DECK_VISIBILITY.PUBLIC) return true;
  if (visibility === DECK_VISIBILITY.FRIENDS) {
    return areFriends(ownerId, viewerId);
  }
  return false;
}

export function isValidNoteVisibility(
  value: string,
): value is (typeof DECK_VISIBILITY)[keyof typeof DECK_VISIBILITY] {
  return (
    value === DECK_VISIBILITY.PUBLIC ||
    value === DECK_VISIBILITY.FRIENDS ||
    value === DECK_VISIBILITY.PRIVATE
  );
}

export async function resolveMatchPlayerNote(input: {
  ownerId: number;
  viewerId: number | null;
  notes: string;
  visibility: string;
  canEdit: boolean;
}): Promise<MatchSharePlayerNote | null> {
  const { ownerId, viewerId, notes, visibility, canEdit } = input;
  const trimmed = notes.trim();

  if (canEdit) {
    return {
      text: notes,
      visibility,
      canEdit: true,
      isHidden: false,
    };
  }

  if (!trimmed) return null;

  const canView = await canViewMatchNote(ownerId, viewerId, visibility);
  if (!canView) {
    return {
      text: null,
      visibility,
      canEdit: false,
      isHidden: true,
    };
  }

  return {
    text: notes,
    visibility,
    canEdit: false,
    isHidden: false,
  };
}

export function getBattleResultNoteFields(
  battleResult: {
    playerANotes: string;
    playerANotesVisibility: string;
    playerBNotes: string;
    playerBNotesVisibility: string;
  },
  playerAId: number,
  playerBId: number,
  viewerId: number,
): {
  notes: string;
  visibility: string;
  field: "playerA" | "playerB";
} {
  if (viewerId === playerAId) {
    return {
      notes: battleResult.playerANotes,
      visibility: battleResult.playerANotesVisibility,
      field: "playerA",
    };
  }
  if (viewerId === playerBId) {
    return {
      notes: battleResult.playerBNotes,
      visibility: battleResult.playerBNotesVisibility,
      field: "playerB",
    };
  }
  throw new Error("非對戰參與者");
}

export function battleResultNoteUpdateData(
  field: "playerA" | "playerB",
  notes: string,
  visibility: string,
): {
  playerANotes?: string;
  playerANotesVisibility?: string;
  playerBNotes?: string;
  playerBNotesVisibility?: string;
} {
  if (field === "playerA") {
    return {
      playerANotes: notes,
      playerANotesVisibility: visibility,
    };
  }
  return {
    playerBNotes: notes,
    playerBNotesVisibility: visibility,
  };
}
