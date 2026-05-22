"use client";

// Used by BattleClient ResponsiveSheet only — do not duplicate publish form logic.

import { useEffect, useState, useTransition } from "react";
import { publishBattleAnnouncement } from "@/actions/meetSpot";
import {
  ANNOUNCEMENT_TTL_DEFAULT_HOURS,
  ANNOUNCEMENT_TTL_MAX_HOURS,
  ANNOUNCEMENT_TTL_MIN_HOURS,
} from "@/lib/constants";

export type PublishDraft = {
  lat: number;
  lng: number;
  label: string;
  shopId?: string | null;
};

type Props = {
  draft: PublishDraft;
  onClose: () => void;
  onPublished: (published: PublishDraft & { label: string }) => void;
};

export function PublishAnnouncementContent({ draft, onClose, onPublished }: Props) {
  const [ttlHours, setTtlHours] = useState(ANNOUNCEMENT_TTL_DEFAULT_HOURS);
  const [playNote, setPlayNote] = useState("");
  const [label, setLabel] = useState(draft.label);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLabel(draft.label);
    setTtlHours(ANNOUNCEMENT_TTL_DEFAULT_HOURS);
    setPlayNote("");
    setErr(null);
  }, [draft.lat, draft.lng, draft.label, draft.shopId]);

  const handlePublish = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setErr("請輸入地點名稱");
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        await publishBattleAnnouncement({
          lat: draft.lat,
          lng: draft.lng,
          label: trimmed,
          playNote,
          shopId: draft.shopId,
          ttlHours,
        });
        onPublished({ ...draft, label: trimmed });
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "發布失敗");
      }
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-5">

      {/* Location Name */}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">地點名稱</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={
            draft.label.trim() ? "例：XX 卡店、咖啡廳" : "輸入地點名稱（必填）"
          }
          className="input-field mt-2"
          required
        />
      </label>

      {/* Play note */}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">約戰說明（選填）</span>
        <textarea
          value={playNote}
          onChange={(e) => setPlayNote(e.target.value)}
          placeholder="例：休閒友好、標準環境、新手可、可借牌練習"
          className="input-field mt-2 min-h-[88px] resize-y"
          maxLength={500}
          rows={3}
        />
      </label>

      {/* TTL hours */}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">公告時長（小時）</span>
        <input
          type="number"
          value={ttlHours}
          onChange={(e) => setTtlHours(Number(e.target.value))}
          min={ANNOUNCEMENT_TTL_MIN_HOURS}
          max={ANNOUNCEMENT_TTL_MAX_HOURS}
          step={1}
          className="input-field mt-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          預設 {ANNOUNCEMENT_TTL_DEFAULT_HOURS} 小時，可設定 {ANNOUNCEMENT_TTL_MIN_HOURS}–
          {ANNOUNCEMENT_TTL_MAX_HOURS} 小時
        </p>
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
