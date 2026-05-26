"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      
      if (!res.ok) {
        let errorMsg = "註冊失敗";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) errorMsg = data.error;
        } catch {
          // ignore parsing error if response is not JSON
        }
        setError(errorMsg);
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError("發生錯誤，請稍後再試或檢查網路連線");
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">註冊</h1>
        <p className="mt-1 text-sm text-muted-foreground">建立帳號以找玩家、約戰與聊天</p>
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
        <span className="text-muted-foreground">顯示名稱</span>
        <input
          type="text"
          autoComplete="nickname"
          data-testid="register-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input-field mt-2"
          required
          maxLength={40}
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">電子郵件</span>
        <input
          type="email"
          autoComplete="email"
          data-testid="register-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field mt-2"
          required
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        <span className="text-muted-foreground">密碼（至少 8 字元）</span>
        <input
          type="password"
          autoComplete="new-password"
          data-testid="register-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field mt-2"
          required
          minLength={8}
        />
      </label>
      <button
        type="submit"
        data-testid="register-submit"
        disabled={loading}
        className="btn btn-primary btn-block"
      >
        {loading ? "建立中…" : "建立帳號"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        已有帳號？{" "}
        <Link href="/login" className="link-secondary">
          登入
        </Link>
      </p>
    </form>
  );
}
