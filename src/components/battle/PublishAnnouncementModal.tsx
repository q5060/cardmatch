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
  draft: PublishDraft | null;
  onClose: () => void;
  onPublished: () => void;
};

export function PublishAnnouncementModal({ draft, onClose, onPublished }: Props) {
  const [timeNote, setTimeNote] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!draft) return null;

  const displayLabel = label || draft.label;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-announcement-title"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="publish-announcement-title" className="text-lg font-semibold text-foreground">
          發布約戰公告
        </h2>
        <p className="text-sm text-muted-foreground">
          座標：{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
        </p>
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
        <label className="block text-sm font-medium text-foreground">
          <span className="text-muted-foreground">方便時段（選填）</span>
          <input
            value={timeNote}
            onChange={(e) => setTimeNote(e.target.value)}
            placeholder="例：週六 14:00–18:00"
            className="input-field mt-2"
          />
        </label>
        {err ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {err}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
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
            }}
            className="btn btn-primary"
          >
            {pending ? "發布中…" : "發布公告"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-outline">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
