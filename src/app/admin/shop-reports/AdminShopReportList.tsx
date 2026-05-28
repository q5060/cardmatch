"use client";

import { useState } from "react";
import { resolveShopReport, dismissShopReport, replyToShopReport } from "@/actions/shops";

const TYPE_LABEL: Record<string, string> = {
  MISSING: "建議新增",
  INCORRECT: "誤判店家",
  CLOSED: "已歇業",
  OTHER: "其他",
};

type Report = {
  id: string;
  type: string;
  shopName: string | null;
  address: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: Date;
  reporter: { id: number; displayName: string; email: string };
  shop: { id: string; name: string } | null;
};

export function AdminShopReportList({
  reports,
  status,
}: {
  reports: Report[];
  status: "PENDING" | "RESOLVED" | "DISMISSED";
}) {
  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} status={status} />
      ))}
    </ul>
  );
}

function ReportCard({
  report: r,
  status,
}: {
  report: Report;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleReply() {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await replyToShopReport(r.id, note);
      setNoteOpen(false);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(action: "resolve" | "dismiss") {
    setSubmitting(true);
    try {
      if (action === "resolve") await resolveShopReport(r.id, note || undefined);
      else await dismissShopReport(r.id, note || undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                r.type === "MISSING"
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : r.type === "CLOSED"
                  ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                  : r.type === "OTHER"
                  ? "bg-neutral-50 text-neutral-700 ring-1 ring-neutral-200"
                  : "bg-red-50 text-red-700 ring-1 ring-red-200"
              }`}
            >
              {TYPE_LABEL[r.type] ?? r.type}
            </span>
            {r.shop && (
              <span className="text-sm font-medium text-foreground truncate">{r.shop.name}</span>
            )}
            {r.shopName && (
              <span className="text-sm font-medium text-foreground truncate">{r.shopName}</span>
            )}
          </div>
          {r.address && <p className="text-xs text-muted-foreground">{r.address}</p>}
          {r.note && <p className="text-sm text-foreground mt-1">{r.note}</p>}
          {r.adminNote && (
            <p className="text-xs text-emerald-600 mt-1">已回覆：{r.adminNote}</p>
          )}
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            回報者：{r.reporter.displayName}（{r.reporter.email}）
            ・{new Date(r.createdAt).toLocaleString("zh-TW")}
          </p>
        </div>

        {status === "PENDING" && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              {noteOpen ? "收起" : "回覆"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("resolve")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              已處理
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction("dismiss")}
              className="px-3 py-1.5 rounded-lg bg-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-300 transition-colors disabled:opacity-50"
            >
              忽略
            </button>
          </div>
        )}
      </div>

      {noteOpen && status === "PENDING" && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="回覆玩家（選填）—— 玩家會收到通知。點「送出回覆」僅傳訊，點「已處理」或「忽略」會同時更改狀態。"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <button
            type="button"
            disabled={submitting || !note.trim()}
            onClick={handleReply}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            送出回覆
          </button>
        </div>
      )}
    </li>
  );
}
