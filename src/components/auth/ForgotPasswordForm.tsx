"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  onBack: () => void;
};

export function ForgotPasswordForm({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "寄信失敗");
        return;
      }
      setSuccess(
        data.message ??
          "若此電子郵件已註冊，我們已寄出密碼重設信，請查收信箱。",
      );
    } catch {
      setError("發生錯誤，請稍後再試");
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">忘記密碼</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          輸入註冊時的電子郵件，我們會寄送一組暫時密碼。登入後請至設定頁更改密碼。
        </p>
      </div>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          role="status"
        >
          {success}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">電子郵件</span>
        <input
          type="email"
          autoComplete="email"
          data-testid="forgot-password-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field mt-2"
          required
          disabled={!!success}
        />
      </label>
      <button
        type="submit"
        data-testid="forgot-password-submit"
        disabled={loading || !!success}
        className="btn btn-secondary btn-block"
      >
        {loading ? "寄送中…" : "寄送重設信"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="link-primary font-medium"
        >
          返回登入
        </button>
      </p>
    </form>
  );
}
