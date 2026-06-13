"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createDeck } from "@/actions/decks";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Alert } from "@/components/ui/Alert";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "公開", desc: "所有人都可以看到" },
  { value: "FRIENDS", label: "限好友", desc: "只有加為好友的人可以看到" },
  { value: "PRIVATE", label: "私人", desc: "只有自己可以看到" },
];

export default function NewDeckPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [officialCode, setOfficialCode] = useState("");
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
      formData.append("officialCode", officialCode);
      const newDeck = await createDeck(formData);
      if (newDeck?.id) {
      // 導向到「組成編輯」頁面
      router.push(`/decks/${newDeck.id}/edit`);
    }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "建立牌組失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <BackLink href="/settings?tab=decks" />
        <PageHeader
          className="flex-1"
          eyebrow="牌組"
          title="新增牌組"
          description="建立並管理您的牌組清單"
        />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card card-hover space-y-5 p-6">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
              牌組名稱 *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：魔靈多龍"
              className="input-field"
              maxLength={120}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">{title.length} / 120</p>
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-foreground">
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

          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">隱私設定</label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    visibility === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 transition-all ${
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

        <div>
          <label htmlFor="officialCode" className="mb-1.5 block text-sm font-medium text-foreground">
            官方牌組代碼 (選填)
          </label>
          <input
            id="officialCode"
            name="officialCode" // 確保 formData 能抓到
            type="text"
            value={officialCode}
            onChange={(e) => setOfficialCode(e.target.value)}
            placeholder="輸入官方網站的代碼以自動匯入"
            className="input-field"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/settings?tab=decks" className="btn btn-outline">
            取消
          </Link>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" aria-hidden />
            {saving ? "建立中..." : "建立牌組"}
          </button>
        </div>
      </form>
    </div>
  );
}
