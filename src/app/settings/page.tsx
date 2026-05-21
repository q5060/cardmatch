"use client";

import { useState, useEffect, Suspense } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, Shield, LogOut, Plus, Trash2, Edit2, Layers } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

interface UserSettings {
  id: number;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  battleRecordVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  winrateVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  defaultShopId: string | null;
}

interface Deck {
  id: string;
  name: string;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  cardCount: number;
}

const TAB_IDS = ["account", "decks", "privacy", "security"] as const;
type TabId = (typeof TAB_IDS)[number];

function normalizeTab(raw: string | null): TabId {
  if (raw && TAB_IDS.includes(raw as TabId)) return raw as TabId;
  return "account";
}

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "account", label: "帳戶設定", icon: User },
  { id: "decks", label: "管理牌組", icon: Layers },
  { id: "privacy", label: "隱私設定", icon: Shield },
  { id: "security", label: "密碼與安全", icon: Lock },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const [user, setUser] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [battleRecordVisibility, setBattleRecordVisibility] = useState<
    "PUBLIC" | "FRIENDS" | "PRIVATE"
  >("PUBLIC");
  const [winrateVisibility, setWinrateVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">(
    "PUBLIC",
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [decks, setDecks] = useState<Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);

  useEffect(() => {
    document.title = "設定 | CardMatch";
  }, []);

  const selectTab = (id: TabId) => {
    const url = id === "account" ? "/settings" : `/settings?tab=${id}`;
    router.replace(url);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          redirect("/login");
        }
        const data = await res.json();
        setUser(data);
        setDisplayName(data.displayName || "");
        setBio(data.bio || "");
        setBattleRecordVisibility(data.battleRecordVisibility || "PUBLIC");
        setWinrateVisibility(data.winrateVisibility || "PUBLIC");

        const decksRes = await fetch("/api/decks");
        if (decksRes.ok) {
          const decksData = await decksRes.json();
          setDecks(decksData);
        }
      } catch {
        redirect("/login");
      }
    };
    fetchUser();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: "error", text: "圖片大小不能超過 2MB" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setMessage({ type: "error", text: "橫幅圖片大小不能超過 3MB" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerPreview(event.target?.result as string);
        setBannerFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("bio", bio);
      if (avatarFile) formData.append("avatar", avatarFile);
      if (bannerFile) formData.append("banner", bannerFile);

      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      setAvatarPreview(null);
      setAvatarFile(null);
      setBannerPreview(null);
      setBannerFile(null);
      setMessage({ type: "success", text: "檔案已成功更新" });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "更新失敗",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleRecordVisibility, winrateVisibility }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }

      setMessage({ type: "success", text: "隱私設定已更新" });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "更新失敗",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "兩次新密碼輸入不一致" });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "新密碼至少需要 8 個字元" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "密碼更改失敗");
      }
      setMessage({ type: "success", text: "密碼已成功更改" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "密碼更改失敗",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      redirect("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeckDelete = async (deckId: string) => {
    if (!confirm("確定要刪除此牌組嗎？")) return;

    setDecksLoading(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("刪除失敗");

      setDecks(decks.filter((d) => d.id !== deckId));
      setMessage({ type: "success", text: "牌組已刪除" });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "刪除失敗",
      });
    } finally {
      setDecksLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-soft-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="設定"
      />

      {message ? (
        <Alert variant={message.type === "success" ? "success" : "error"}>{message.text}</Alert>
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="tabs shrink-0 lg:w-52 lg:flex-col lg:border-b-0 lg:border-r lg:pr-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                data-active={activeTab === tab.id}
                className="tab-trigger flex items-center gap-2"
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === "account" && (
            <div className="card space-y-6 p-6">
              <h2 className="text-lg font-semibold text-foreground">帳戶設定</h2>

              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <label className="block text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">顯示名稱</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field mt-2"
                    placeholder="輸入您的顯示名稱"
                  />
                </label>

                <label className="block text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">自我介紹</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input-field mt-2 min-h-[5rem] resize-y"
                    placeholder="用一段話介紹自己"
                    rows={3}
                  />
                </label>

                <div>
                  <p className="text-sm font-medium text-foreground">大頭貼</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    支援 JPG、PNG 與 WebP，大小上限 2MB
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    {(avatarPreview || user.avatarUrl) && (
                      <Image
                        src={avatarPreview || user.avatarUrl || ""}
                        alt="Avatar Preview"
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-white"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="input-field max-w-sm cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">個人檔案橫幅</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    支援 JPG、PNG 與 WebP，大小上限 3MB
                  </p>
                  <div className="mt-3 space-y-3">
                    {(bannerPreview || user.bannerUrl) && (
                      <Image
                        src={bannerPreview || user.bannerUrl || ""}
                        alt="Banner Preview"
                        width={400}
                        height={150}
                        className="h-32 w-full rounded-xl object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="input-field cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "更新中..." : "保存變更"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "decks" && (
            <div className="card space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">管理牌組</h2>
                <Link href="/decks/new" className="btn btn-primary btn-sm">
                  <Plus className="h-4 w-4" aria-hidden />
                  新增牌組
                </Link>
              </div>

              {decks.length === 0 ? (
                <EmptyState title="您還沒有建立任何牌組" description="點擊上方按鈕新增第一個牌組" />
              ) : (
                <ul className="space-y-3">
                  {decks.map((deck) => (
                    <li
                      key={deck.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-black/[0.02] p-4"
                    >
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground">{deck.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {deck.cardCount} 張牌卡 · {deck.visibility}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Link
                          href={`/decks/${deck.id}/edit`}
                          className="btn btn-ghost p-2"
                          aria-label="編輯"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeckDelete(deck.id)}
                          disabled={decksLoading}
                          className="btn btn-ghost p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label="刪除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="card space-y-6 p-6">
              <h2 className="text-lg font-semibold text-foreground">隱私設定</h2>
              <label className="block text-sm font-medium text-foreground">
                <span className="text-muted-foreground">戰鬥紀錄可見性</span>
                <select
                  value={battleRecordVisibility}
                  onChange={(e) =>
                    setBattleRecordVisibility(e.target.value as "PUBLIC" | "FRIENDS" | "PRIVATE")
                  }
                  className="input-field mt-2"
                >
                  <option value="PUBLIC">公開</option>
                  <option value="FRIENDS">僅好友</option>
                  <option value="PRIVATE">私密</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-foreground">
                <span className="text-muted-foreground">勝率可見性</span>
                <select
                  value={winrateVisibility}
                  onChange={(e) =>
                    setWinrateVisibility(e.target.value as "PUBLIC" | "FRIENDS" | "PRIVATE")
                  }
                  className="input-field mt-2"
                >
                  <option value="PUBLIC">公開</option>
                  <option value="FRIENDS">僅好友</option>
                  <option value="PRIVATE">私密</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handlePrivacyUpdate}
                disabled={loading}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "更新中..." : "保存隱私設定"}
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="card space-y-6 p-6">
              <h2 className="text-lg font-semibold text-foreground">密碼與安全</h2>
              <form onSubmit={handleChangePassword} className="space-y-5">
                <label className="block text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">目前密碼</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field mt-2"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">新密碼</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field mt-2"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">確認新密碼</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field mt-2"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    loading || newPassword !== confirmPassword || newPassword.length < 8
                  }
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "更新中..." : "更改密碼"}
                </button>
              </form>

              <div className="border-t border-border pt-6">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-outline btn-block border-red-200 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  登出
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-soft-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
