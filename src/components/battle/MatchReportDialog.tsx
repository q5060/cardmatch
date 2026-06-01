"use client";

import { useState, useTransition } from "react";
import {
  MATCH_REPORT_CATEGORIES,
  MATCH_REPORT_CATEGORY_LABELS,
  type MatchReportCategory,
} from "@/lib/matchReportCategories";
import { reportMatchOpponent } from "@/actions/moderation";

type Props = {
  matchId: number;
  opponentName: string;
  onClose: () => void;
  onReported: () => void;
};

const CATEGORY_ORDER: MatchReportCategory[] = [
  MATCH_REPORT_CATEGORIES.NOT_READY,
  MATCH_REPORT_CATEGORIES.UNREASONABLE_CANCEL,
  MATCH_REPORT_CATEGORIES.REFUSE_RESULT,
  MATCH_REPORT_CATEGORIES.OTHER,
];

export function MatchReportDialog({
  matchId,
  opponentName,
  onClose,
  onReported,
}: Props) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [selected, setSelected] = useState<Set<MatchReportCategory>>(new Set());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleCategory(cat: MatchReportCategory) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function goConfirm() {
    setError(null);
    if (selected.size === 0) {
      setError("請至少選擇一項原因");
      return;
    }
    setStep("confirm");
  }

  function submitReport() {
    setError(null);
    startTransition(async () => {
      try {
        await reportMatchOpponent(
          matchId.toString(),
          [...selected],
          note,
        );
        onReported();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "送出失敗");
        setStep("form");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-report-title"
    >
      <div className="card w-full max-w-md p-5 shadow-lg">
        {step === "form" ? (
          <>
            <h3 id="match-report-title" className="text-lg font-semibold text-foreground">
              檢舉對手
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              對手：{opponentName}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              提交檢舉後對戰會直接取消。若確認為對方問題，我們將採取適當行動；若為惡意檢舉，檢舉者亦可能受到處分。
            </p>

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">檢舉原因</legend>
              {CATEGORY_ORDER.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    data-testid={`match-report-cat-${cat}`}
                    checked={selected.has(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    {MATCH_REPORT_CATEGORY_LABELS[cat]}
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="mt-4 block text-sm font-medium text-foreground">
              <span className="text-muted-foreground">補充說明（選填）</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field mt-2 min-h-[72px] resize-y"
                maxLength={200}
                placeholder="請簡述狀況"
              />
            </label>

            {error ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={pending}
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                data-testid="match-report-next"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={goConfirm}
              >
                下一步
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-foreground">確認檢舉</h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              送出後將立即結束本場約戰，並將檢舉內容送交管理員審核。確定要繼續嗎？
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
              {[...selected].map((cat) => (
                <li key={cat}>{MATCH_REPORT_CATEGORY_LABELS[cat]}</li>
              ))}
              {note.trim() ? <li>補充：{note.trim()}</li> : null}
            </ul>

            {error ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={pending}
                onClick={() => setStep("form")}
              >
                返回
              </button>
              <button
                type="button"
                data-testid="match-report-confirm"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={submitReport}
              >
                {pending ? "處理中…" : "確認送出"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
