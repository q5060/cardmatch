"use client";

import { useState, useTransition } from "react";
import { blockUser, unblockUser } from "@/actions/block";

type Props = {
  blockedId: number;
  isBlocked: boolean;
};

export function BlockButton({ blockedId, isBlocked }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBlock = () => {
    startTransition(async () => {
      try {
        await blockUser(blockedId, note.trim() || undefined);
        setShowDialog(false);
        setNote("");
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作失敗");
      }
    });
  };

  const handleUnblock = () => {
    if (!confirm("確定要解除封鎖此用戶？")) return;
    startTransition(async () => {
      try {
        await unblockUser(blockedId);
        window.location.reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : "操作失敗");
      }
    });
  };

  if (isBlocked) {
    return (
      <button
        onClick={handleUnblock}
        disabled={isPending}
        className="btn btn-outline btn-sm text-orange-600 hover:bg-orange-50"
      >
        {isPending ? "處理中..." : "解除封鎖"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => { setShowDialog(true); setError(null); }}
        className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
      >
        封鎖
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDialog(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">確定要封鎖此用戶？</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              對方不會收到通知，且無法在任何介面看到你。好友關係和進行中的對戰將自動取消。
            </p>
            <label className="mt-4 block text-sm font-medium text-foreground">
              <span className="text-muted-foreground">備註（選填）</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="記下封鎖原因..."
                className="input-field mt-1 resize-none text-sm"
              />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="btn btn-outline btn-sm"
              >
                取消
              </button>
              <button
                onClick={handleBlock}
                disabled={isPending}
                className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
              >
                {isPending ? "處理中..." : "確認封鎖"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
