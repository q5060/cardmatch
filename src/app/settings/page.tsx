"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, Shield, LogOut, Plus, Trash2, Edit2 } from "lucide-react";

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

export default function SettingsPage() {
  const [user, setUser] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Account Settings State
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
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
        
        // Load decks
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
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      if (bannerFile) {
        formData.append("banner", bannerFile);
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
      setBannerPreview(null);
      setBannerFile(null);
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
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Account Settings Tab */}
            {activeTab === "account" && (
              <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
                <h2 className="text-xl font-semibold">帳戶設定</h2>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">顯示名稱</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="輸入您的顯示名稱"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium mb-2">自我介紹</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="用一段話介紹自己"
                      rows={3}
                    />
                  </div>

                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-medium mb-2">大頭貼</label>
                    <p className="text-xs text-neutral-500 mb-3">支援 JPG、PNG 與 WebP，大小上限 2MB</p>
                    <div className="flex items-end gap-4">
                      {(avatarPreview || user?.avatarUrl) && (
                        <Image
                          src={avatarPreview || user?.avatarUrl || ""}
                          alt="Avatar Preview"
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Banner */}
                  <div>
                    <label className="block text-sm font-medium mb-2">個人檔案橫幅</label>
                    <p className="text-xs text-neutral-500 mb-3">支援 JPG、PNG 與 WebP，大小上限 3MB</p>
                    <div className="flex flex-col gap-4">
                      {(bannerPreview || user?.bannerUrl) && (
                        <Image
                          src={bannerPreview || user?.bannerUrl || ""}
                          alt="Banner Preview"
                          width={400}
                          height={150}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="px-3 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "更新中..." : "保存變更"}
                  </button>
                </form>
              </div>
            )}

            {/* Decks Tab */}
            {activeTab === "decks" && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">管理牌組</h2>
                  <Link
                    href="/decks/new"
                    className="flex items-center gap-2 px-3 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    新增牌組
                  </Link>
                </div>

                {decks.length === 0 ? (
                  <p className="text-muted-foreground">您還沒有建立任何牌組</p>
                ) : (
                  <div className="space-y-4">
                    {decks.map((deck) => (
                      <div
                        key={deck.id}
                        className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                      >
                        <div>
                          <h3 className="font-medium">{deck.name}</h3>
                          <p className="text-sm text-muted-foreground">{deck.cardCount} 張牌卡 • {deck.visibility}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/decks/${deck.id}/edit`}
                            className="p-2 hover:bg-neutral-200 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeckDelete(deck.id)}
                            disabled={decksLoading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">隱私設定</h2>
                <div className="space-y-6">
                  {/* Battle Record Visibility */}
                  <div>
                    <label className="block text-sm font-medium mb-2">戰鬥紀錄可見性</label>
                    <select
                      value={battleRecordVisibility}
                      onChange={(e) => setBattleRecordVisibility(e.target.value as any)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="PUBLIC">公開</option>
                      <option value="FRIENDS">僅好友</option>
                      <option value="PRIVATE">私密</option>
                    </select>
                  </div>

                  {/* Winrate Visibility */}
                  <div>
                    <label className="block text-sm font-medium mb-2">勝率可見性</label>
                    <select
                      value={winrateVisibility}
                      onChange={(e) => setWinrateVisibility(e.target.value as any)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="PUBLIC">公開</option>
                      <option value="FRIENDS">僅好友</option>
                      <option value="PRIVATE">私密</option>
                    </select>
                  </div>

                  <button
                    onClick={handlePrivacyUpdate}
                    disabled={loading}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "更新中..." : "保存隱私設定"}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6">密碼與安全</h2>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2">目前密碼</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2">新密碼</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2">確認新密碼</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword || newPassword.length < 8} 
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "更新中..." : "更改密碼"}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    登出
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
