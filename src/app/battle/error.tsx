"use client";

import { useEffect } from "react";

export default function BattleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[battle] uncaught error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <p className="text-lg font-semibold text-foreground">發生錯誤</p>
      <p className="text-sm text-muted-foreground">
        操作未能完成，請重新整理後再試。
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary"
      >
        重新整理
      </button>
    </div>
  );
}
