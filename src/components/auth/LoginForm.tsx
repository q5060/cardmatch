"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

/** Same-origin relative path only; blocks protocol-relative and odd schemes. */
function safeLoginRedirect(raw: string | null): string {
  if (!raw) return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  if (t.includes("\\") || t.includes("\0")) return "/";
  return t;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeLoginRedirect(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "登入失敗");
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="card relative mx-auto max-w-sm space-y-5 overflow-hidden p-8 shadow-lg shadow-black/[0.06]"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-teal-300 to-neutral-200"
        aria-hidden
      />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">登入</h1>
        <p className="mt-1 text-sm text-muted-foreground">使用電子郵件繼續使用 CardMatch</p>
      </div>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">電子郵件</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field mt-2"
          required
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">密碼</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field mt-2"
          required
        />
      </label>
      <button type="submit" disabled={loading} className="btn btn-secondary btn-block">
        {loading ? "登入中…" : "登入"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        還沒有帳號？{" "}
        <Link href="/register" className="link-primary">
          註冊
        </Link>
      </p>
    </form>
  );
}
