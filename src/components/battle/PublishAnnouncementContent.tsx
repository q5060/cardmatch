"use client";

import { useState, useTransition } from "react";
import { publishBattleAnnouncement } from "@/actions/meetSpot";

export type PublishDraft = {
  lat: number;
  lng: number;
  label: string;
  shopId?: string | null;
};

type Props = {
  draft: PublishDraft;
  onClose: () => void;
  onPublished: () => void;
};

export function PublishAnnouncementContent({ draft, onClose, onPublished }: Props) {
  const [timeNote, setTimeNote] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayLabel = label || draft.label;

  const handlePublish = () => {
    setErr(null);
    startTransition(async () => {
      try {
        await publishBattleAnnouncement({
          lat: draft.lat,
          lng: draft.lng,
          label: displayLabel.trim() || draft.label,
          timeNote,
          shopId: draft.shopId,
        });
        onPublished();
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "發布失敗");
      }
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-5">

      {/* Coordinates */}
      <p className="text-sm text-muted-foreground">
        座標：{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
      </p>

      {/* Location Name */}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">地點名稱</span>
        <input
          value={displayLabel}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例：XX 卡店、咖啡廳"
          className="input-field mt-2"
          required
        />
      </label>

      {/* Time Note */}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">方便時段（選填）</span>
        <input
          value={timeNote}
          onChange={(e) => setTimeNote(e.target.value)}
          placeholder="例：週六 14:00–18:00"
          className="input-field mt-2"
        />
      </label>

      {/* Error */}
      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border p-5 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={handlePublish}
          className="btn btn-primary flex-1"
        >
          {pending ? "發布中…" : "發布約戰公告"}
        </button>
      </div>
    </div>
  );
}
