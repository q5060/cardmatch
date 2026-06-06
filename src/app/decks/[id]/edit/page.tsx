"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Settings, Search, Plus, Minus } from "lucide-react";

interface Deck {
  id: string;
  title: string;
  deckJson: string | null;
}

type DeckCard = {
  id: number;
  name: string;
  imageUrl?: string | null;
  count: number;
  category?: string;
  subType?: string | null;
  isAceSpec?: boolean;
};

type LibraryCard = {
  id: number;
  name: string;
  imageUrl?: string | null;
  type?: string | null;
  regulationMark?: string | null;
  category?: string;
  subType?: string | null;
  isAceSpec?: boolean;
};

type CardFilters = {
  category: string;
  type: string;
  stage: string;
  search: string;
};

type AddToDeckResult =
  | { ok: true }
  | { ok: false; message: string };

type FeedbackMessage = {
  type: "error" | "success";
  text: string;
};

export default function DeckCompositionEditor() {
  const router = useRouter();
  const { id } = useParams();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [allCards, setAllCards] = useState<LibraryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [libLoading, setLibLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<CardFilters>({
    category: "ALL",
    type: "",
    stage: "",
    search: "",
  });
  const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const fetchLibrary = useCallback(
    async (targetPage: number, append = false) => {
      setLibLoading(true);
      try {
        const params = new URLSearchParams({
          page: targetPage.toString(),
          limit: "20",
          category: filters.category,
          type: filters.type,
          stage: filters.stage,
          search: filters.search,
        });

        const res = await fetch(`/api/cards?${params.toString()}`);
        const data = await res.json();

        if (data && Array.isArray(data.cards)) {
          if (append) {
            setAllCards((prev) => [...prev, ...data.cards]);
          } else {
            setAllCards(data.cards);
          }
          setHasMore(data.hasMore);
        } else {
          console.error("API 回傳格式錯誤:", data);
          if (!append) setAllCards([]);
        }
      } catch (err) {
        console.error("載入失敗", err);
      } finally {
        setLibLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const res = await fetch(`/api/decks/${id}`);
        const data = await res.json();
        setDeck(data);
        if (data.deckJson) {
          setCards(JSON.parse(data.deckJson));
        }
      } catch (err) {
        console.error("牌組載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [id]);

  const updateFilters = (patch: Partial<CardFilters>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch card library when filters change
    void fetchLibrary(1, false);
  }, [fetchLibrary]);

  useEffect(() => {
    if (recentlyAddedId === null) return;
    const id = window.setTimeout(() => setRecentlyAddedId(null), 1200);
    return () => window.clearTimeout(id);
  }, [recentlyAddedId]);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchLibrary(nextPage, true);
  };

  const getDeckCount = (cardId: number) =>
    cards.find((c) => c.id === cardId)?.count ?? 0;

  const handleSetDeckCount = (card: LibraryCard | DeckCard, targetCount: number) => {
    if (targetCount < 0) return;
    
    let maxAllowed = 4;
    const isBasicEnergy = card.category === "ENERGY" && card.subType === "Basic";
    if (isBasicEnergy) maxAllowed = 60;
    if (card.isAceSpec) maxAllowed = 1;
    
    setCards((prevCards) => {
      const existingCard = prevCards.find((c) => c.id === card.id);
      
      let newCount = targetCount;
      if (newCount > maxAllowed) {
        setFeedback({ type: "error", text: `此卡片最多只能放入 ${maxAllowed} 張！` });
        newCount = maxAllowed;
      }
      
      const otherCardsCount = prevCards.reduce((acc, c) => acc + (c.id === card.id ? 0 : c.count), 0);
      if (otherCardsCount + newCount > 60) {
        newCount = 60 - otherCardsCount;
        if (newCount !== targetCount) {
          setFeedback({ type: "error", text: "牌組已達 60 張上限！" });
        }
      }

      if (newCount === 0) {
        return prevCards.filter((c) => c.id !== card.id);
      }

      if (existingCard) {
        return prevCards.map((c) => c.id === card.id ? { ...c, count: newCount } : c);
      }

      return [
        ...prevCards,
        {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          count: newCount,
          category: card.category,
          subType: card.subType,
          isAceSpec: card.isAceSpec,
        },
      ];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 改用 JSON 物件
      const payload = {
        deckJson: JSON.stringify(cards)
      };

      const res = await fetch(`/api/decks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json", // 加上 Header
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.refresh();
        alert("牌組組成已儲存");
      }
    } catch {
      alert("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">載入中...</div>;

  return (
    <main className="min-h-screen bg-neutral-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/profile" className="p-2 hover:bg-neutral-200 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{deck?.title}</h1>
              <p className="text-sm text-muted-foreground">編輯牌組組成</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 連結到編輯牌組資訊的按鈕 */}
            <Link 
              href={`/decks/${id}/setting`} 
              className="btn btn-outline flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              牌組設定
            </Link>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "儲存中..." : "儲存組成"}
            </button>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mb-6 motion-toast-in flex items-start justify-between gap-3 ${
              feedback.type === "error" ? "alert-error" : "alert-success"
            }`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            <p>{feedback.text}</p>
            <button
              type="button"
              className="shrink-0 underline-offset-2 hover:underline"
              onClick={() => setFeedback(null)}
              aria-label="關閉提示"
            >
              關閉
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左側：目前牌組內容 (1-60張) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <h2 className="font-bold mb-4 flex justify-between">
                牌組清單 <span>{cards.reduce((acc, curr) => acc + curr.count, 0)} / 60</span>
              </h2>
              <div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2">
                {cards.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">尚未加入卡片</p>
                ) : (
                  cards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg border border-transparent hover:border-neutral-200">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold w-6 text-primary">x{card.count}</span>
                        <span className="text-sm truncate max-w-[150px]">{card.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleSetDeckCount(card, card.count + 1)}
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-primary transition-colors disabled:opacity-50"
                        title="增加數量"
                        disabled={
                          cards.reduce((acc, c) => acc + c.count, 0) >= 60 || 
                          (!((card.category === "ENERGY" && card.subType === "Basic")) && card.count >= 4) ||
                          (card.isAceSpec && card.count >= 1)
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleSetDeckCount(card, card.count - 1)}
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-red-600 transition-colors"
                        title="減少數量"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右側：卡片資料庫搜尋 [cite: 26, 27, 28, 29, 30, 31] */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {/* 類別選單 */}
                <select 
                  value={filters.category}
                  onChange={(e) => updateFilters({ category: e.target.value })}
                  className="input-field w-40"
                >
                  <option value="ALL">全類別</option>
                  <option value="POKEMON">寶可夢</option>
                  <option value="物品">物品</option>
                  <option value="寶可夢道具">寶可夢道具</option>
                  <option value="支援者">支援者</option>
                  <option value="競技場">競技場</option>
                  <option value="ENERGY">能量</option>
                </select>

                {/* 寶可夢專屬篩選：僅在類別為 POKEMON 時顯示 */}
                {filters.category === "POKEMON" && (
                  <>
                    <select 
                      value={filters.type}
                      onChange={(e) => updateFilters({ type: e.target.value })}
                      className="input-field w-32"
                    >
                      <option value="">選屬性</option>
                      <option value="草">草</option>
                      <option value="火">火</option>
                      <option value="水">水</option>
                      <option value="雷">雷</option>
                      <option value="超">超</option>
                      <option value="鬥">鬥</option>
                      <option value="惡">惡</option>
                      <option value="鋼">鋼</option>
                      <option value="龍">龍</option>
                      <option value="無">無</option>
                    </select>

                    <select 
                      value={filters.stage}
                      onChange={(e) => updateFilters({ stage: e.target.value })}
                      className="input-field w-32"
                    >
                      <option value="">基礎進化</option>
                      <option value="基礎">基礎寶可夢</option>
                      <option value="1階進化">1階進化</option>
                      <option value="2階進化">2階進化</option>
                    </select>
                  </>
                )}
              </div>

              {/* 關鍵字搜尋 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="搜尋卡片名稱..."
                  className="input-field pl-10"
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                />
              </div>
            </div>    

            {/* 卡片網格展示區域 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allCards.map((card) => {
                const deckCount = getDeckCount(card.id);

                return (
                <div key={card.id} className="bg-white rounded-xl border p-2 hover:shadow-md group">
                  <div className="aspect-[3/4] mb-2 bg-neutral-100 rounded overflow-hidden relative">
                    {deckCount > 0 ? (
                      <span className="absolute top-1 right-1 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        x{deckCount}
                      </span>
                    ) : null}
                    {card.imageUrl ? (
                      <img 
                        src={card.imageUrl} 
                        alt={card.name} 
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        title={card.name}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground text-center px-1">
                          {card.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground">{card.type} / {card.regulationMark}</p>
                  
                  <div className="mt-2 flex items-center justify-between border rounded-md overflow-hidden bg-neutral-50 h-8">
                    <button 
                      onClick={() => handleSetDeckCount(card, deckCount - 1)}
                      className="w-8 h-full flex items-center justify-center hover:bg-neutral-200 text-neutral-600 transition-colors disabled:opacity-50"
                      disabled={deckCount === 0}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input 
                      type="number" 
                      className="w-full text-center bg-transparent text-xs font-bold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={deckCount === 0 ? "" : deckCount}
                      placeholder="0"
                      min={0}
                      onChange={(e) => {
                         const val = parseInt(e.target.value);
                         handleSetDeckCount(card, isNaN(val) ? 0 : val);
                      }}
                    />
                    <button 
                      onClick={() => handleSetDeckCount(card, deckCount + 1)} 
                      className="w-8 h-full flex items-center justify-center hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                      disabled={
                        deckCount >= 60 || 
                        (!((card.category === "ENERGY" && card.subType === "Basic")) && deckCount >= 4) ||
                        (card.isAceSpec && deckCount >= 1)
                      }
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={handleLoadMore}
                  disabled={libLoading}
                  className="btn btn-outline w-full max-w-xs"
                >
                  {libLoading ? "載入中..." : "顯示更多卡片"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}