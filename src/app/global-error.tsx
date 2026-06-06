"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] uncaught error:", error);
  }, [error]);

  return (
    <html lang="zh-Hant">
      <body className="min-h-full font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-xl font-semibold">發生錯誤</p>
          <p className="text-sm text-gray-500">
            操作未能完成，請重新整理後再試。
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            重新整理
          </button>
        </div>
      </body>
    </html>
  );
}
