"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, Shield, LogOut, Plus, Edit2, Trash2 } from "lucide-react";
import { updateProfile, removeAvatar } from "@/actions/profile";

interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
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

export default function SettingsPage() {
  const [user, setUser] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Account Settings State
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Privacy Settings State
  const [battleRecordVisibility, setBattleRecordVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC");
  const [winrateVisibility, setWinrateVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC");
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Decks State
  const [decks, setDecks] = useState<Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);

  useEffect(() => {
    document.title = "設定 | CardMatch";
  }, []);

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
        
        // 載入牌組
        const decksRes = await fetch("/api/decks");
        if (decksRes.ok) {
          const decksData = await decksRes.json();
          setDecks(decksData);
        }
      } catch (error) {
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("displayName", displayName);
      formData.append("bio", bio);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      
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
      setMessage({ type: "success", text: "檔案已成功更新" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
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
        body: JSON.stringify({
          battleRecordVisibility,
          winrateVisibility,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }
      
      setMessage({ type: "success", text: "隱私設定已更新" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
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
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
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
      
      setDecks(decks.filter(d => d.id !== deckId));
      setMessage({ type: "success", text: "牌組已刪除" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDecksLoading(false);
    }
  };

  const tabs = [
    { id: "account", label: "帳戶設定", icon: User },
    { id: "decks", label: "管理牌組", icon: Shield },
    { id: "privacy", label: "隱私設定", icon: Shield },
    { id: "security", label: "密碼與安全", icon: Lock },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">設定</h1>
          <p className="text-muted-foreground mt-2">管理您的帳號資訊、隱私設定與密碼安全。</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0">
            <nav className="flex md:flex-col gap-1 pb-4 md:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap md:whitespace-normal ${
                      activeTab === tab.id
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:bg-neutral-200 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}

              <div className="hidden md:block my-4 border-t border-border"></div>

              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap md:whitespace-normal"
              >
                <LogOut className="w-5 h-5 mr-3 shrink-0" />
                登出
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 max-w-3xl">
            
            {/* Account Settings Tab */}
            {activeTab === "account" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="card card-hover space-y-5 p-6">
                  <h2 className="text-lg font-semibold text-foreground">頭像</h2>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-neutral-100">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="預覽"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.displayName}
                          width={96}
                          height={96}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground font-bold">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        className="input-field"
                      />
                      <p className="text-xs text-muted-foreground">
                        支援 JPEG、PNG 或 WebP 格式，最多 2 MB
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="card card-hover space-y-5 p-6">
                    <h2 className="text-lg font-semibold text-foreground">基本資料</h2>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                        電子郵件
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">電子郵件無法更改</p>
                    </div>

                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-1.5">
                        顯示名稱
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={50}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1.5">
                        個人簡介
                      </label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={500}
                        rows={4}
                        className="input-field resize-none"
                        placeholder="分享一些關於您的資訊..."
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "更新中..." : "保存變更"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Manage Decks Tab */}
            {activeTab === "decks" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">我的牌組</h2>
                  <Link href="/decks/new" className="btn btn-primary btn-sm">
                    <Plus className="w-4 h-4" />
                    新增牌組
                  </Link>
                </div>

                {decks.length === 0 ? (
                  <div className="card card-hover text-center p-8">
                    <p className="text-muted-foreground">您還沒有建立任何牌組</p>
                    <Link href="/decks/new" className="btn btn-primary mt-4">
                      建立第一個牌組
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {decks.map((deck) => (
                      <div key={deck.id} className="card card-hover p-4 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground truncate">{deck.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                              {deck.cardCount} 張卡牌
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              deck.visibility === "PUBLIC" ? "bg-green-50 text-green-700" :
                              deck.visibility === "FRIENDS" ? "bg-blue-50 text-blue-700" :
                              "bg-gray-50 text-gray-700"
                            }`}>
                              {deck.visibility === "PUBLIC" ? "公開" :
                               deck.visibility === "FRIENDS" ? "好友可見" : "私密"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <Link href={`/decks/${deck.id}/edit`} className="btn btn-ghost btn-sm">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeckDelete(deck.id)}
                            disabled={decksLoading}
                            className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Settings Tab */}
            {activeTab === "privacy" && (
              <form onSubmit={(e) => { e.preventDefault(); handlePrivacyUpdate(); }} className="space-y-6 animate-in fade-in duration-300">
                <div className="card card-hover space-y-5 p-6">
                  <h2 className="text-lg font-semibold text-foreground">隱私設定</h2>
                  <p className="text-sm text-muted-foreground">
                    控制其他人能看到您的哪些資訊
                  </p>

                  <div>
                    <label htmlFor="battleRecordVisibility" className="block text-sm font-medium text-foreground mb-1.5">
                      對戰紀錄可見性
                    </label>
                    <select
                      id="battleRecordVisibility"
                      value={battleRecordVisibility}
                      onChange={(e) => setBattleRecordVisibility(e.target.value as any)}
                      className="input-field"
                    >
                      <option value="PUBLIC">公開 - 所有人都能看到</option>
                      <option value="FRIENDS">好友可見 - 僅好友能看到</option>
                      <option value="PRIVATE">私密 - 只有您能看到</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="winrateVisibility" className="block text-sm font-medium text-foreground mb-1.5">
                      勝率可見性
                    </label>
                    <select
                      id="winrateVisibility"
                      value={winrateVisibility}
                      onChange={(e) => setWinrateVisibility(e.target.value as any)}
                      className="input-field"
                    >
                      <option value="PUBLIC">公開 - 所有人都能看到</option>
                      <option value="FRIENDS">好友可見 - 僅好友能看到</option>
                      <option value="PRIVATE">私密 - 只有您能看到</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "更新中..." : "保存隱私設定"}
                  </button>
                </div>
              </form>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="card card-hover space-y-5 p-6">
                  <h2 className="text-lg font-semibold text-foreground">更改密碼</h2>
                  <p className="text-sm text-muted-foreground">
                    確保您的帳戶安全，建議定期更改密碼。
                  </p>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-1.5">
                        目前密碼
                      </label>
                      <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1.5">
                        新密碼
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少 8 個字元"
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                        確認新密碼
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        loading || !currentPassword || !newPassword || !confirmPassword
                      }
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "更新中..." : "更新密碼"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
