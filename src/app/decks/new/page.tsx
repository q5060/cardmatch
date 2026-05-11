"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createDeck } from "@/actions/decks";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "公開", desc: "所有人都可以看到" },
  { value: "PRIVATE", label: "私人", desc: "只有自己可以看到" },
];

export default function NewDeckPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("請輸入牌組名稱");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("notes", notes);
      formData.append("visibility", visibility);
      await createDeck(formData);
      router.push("/settings?tab=decks");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "建立牌組失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">新增牌組</h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card card-hover p-6 space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1.5">
                牌組名稱 *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：惡系 - 惡食大王 ex"
                className="input-field"
                maxLength={120}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">{title.length} / 120</p>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1.5">
                備註
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="記錄牌組的特色、策略或其他備註"
                rows={4}
                className="input-field resize-y"
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-muted-foreground">{notes.length} / 2000</p>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">隱私設定</label>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      visibility === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 transition-all ${
                        visibility === opt.value
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Link href="/profile" className="btn btn-outline">
              取消
            </Link>
            <button type="submit" disabled={!title.trim() || saving} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "建立中..." : "建立牌組"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
