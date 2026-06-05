"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateMatchNotes } from "@/actions/match";
import type { MatchSharePayload, MatchSharePlayer } from "@/lib/matchShare";
import { MATCH_NOTE_MAX_LENGTH } from "@/lib/matchNotes";
import { DeckVisibilityBadge } from "@/components/battle/DeckVisibilityBadge";
import { Alert } from "@/components/ui/Alert";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "公開", desc: "所有人都可以看到" },
  { value: "FRIENDS", label: "限好友", desc: "只有加為好友的人可以看到" },
  { value: "PRIVATE", label: "私人", desc: "只有自己可以看到" },
] as const;

type Props = {
  share: MatchSharePayload;
  viewerId: number | null;
  onShareUpdate?: (share: MatchSharePayload) => void;
};

function NoteReadBlock({
  player,
  label,
}: {
  player: MatchSharePlayer;
  label: string;
}) {
  const note = player.note;
  if (!note) return null;

  if (note.isHidden) {
    return (
      <div className="rounded-xl border border-border bg-black/[0.02] px-4 py-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">已撰寫備註但未公開</p>
      </div>
    );
  }

  if (!note.text?.trim()) return null;

  return (
    <div className="rounded-xl border border-border bg-black/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <DeckVisibilityBadge visibility={note.visibility} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.text}</p>
    </div>
  );
}

export function MatchResultNotesPanel({ share, viewerId, onShareUpdate }: Props) {
  const router = useRouter();
  const myPlayer =
    viewerId === share.playerA.id
      ? share.playerA
      : viewerId === share.playerB.id
        ? share.playerB
        : null;
  const opponentPlayer = myPlayer
    ? myPlayer.id === share.playerA.id
      ? share.playerB
      : share.playerA
    : null;

  const myNote = myPlayer?.note;
  const [notes, setNotes] = useState(myNote?.text ?? "");
  const [visibility, setVisibility] = useState(myNote?.visibility ?? "PUBLIC");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const isDirty = useMemo(() => {
    if (!myNote?.canEdit) return false;
    return notes !== (myNote.text ?? "") || visibility !== myNote.visibility;
  }, [myNote, notes, visibility]);

  const handleSave = useCallback(() => {
    if (!myNote?.canEdit) return;
    setError("");
    setSaved(false);
    startTransition(async () => {
      try {
        const updated = await updateMatchNotes(
          share.matchId.toString(),
          notes,
          visibility,
        );
        if (onShareUpdate) onShareUpdate(updated);
        else router.refresh();
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "儲存失敗");
      }
    });
  }, [myNote?.canEdit, notes, onShareUpdate, router, share.matchId, visibility]);

  const otherNotes = useMemo(() => {
    const readablePlayers =
      myPlayer && opponentPlayer
        ? [opponentPlayer]
        : [share.playerA, share.playerB];

    const blocks = readablePlayers
      .filter((player) => player.note !== null && player.note !== undefined)
      .map((player) => (
        <NoteReadBlock
          key={player.id}
          player={player}
          label={`${player.displayName} 的備註`}
        />
      ));

    if (blocks.length === 0) return null;
    return <div className="space-y-3">{blocks}</div>;
  }, [myPlayer, opponentPlayer, share.playerA, share.playerB]);

  if (!myNote?.canEdit && !otherNotes) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-black/[0.06] bg-white px-5 py-4 shadow-inner sm:px-6">
      

      {myNote?.canEdit ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`match-notes-${share.matchId}`}
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              對戰備註
            </label>
            <textarea
              id={`match-notes-${share.matchId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="記錄對戰過程、牌組表現、學到的策略…"
              rows={4}
              maxLength={MATCH_NOTE_MAX_LENGTH}
              className="w-full rounded-xl border border-border bg-neutral-50 px-3 py-2 text-sm text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {notes.length} / {MATCH_NOTE_MAX_LENGTH}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">公開對象</p>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    visibility === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 transition-all ${
                      visibility === opt.value
                        ? "border-primary bg-primary"
                        : "border-border"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !isDirty}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" aria-hidden />
              {pending ? "儲存中…" : saved ? "已儲存" : "儲存備註"}
            </button>
          </div>
        </div>
      ) : null}

      {otherNotes}
    </div>
  );
}
