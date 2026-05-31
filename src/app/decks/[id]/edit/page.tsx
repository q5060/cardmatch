"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchLibrary(nextPage, true);
  };

  const addToDeck = (card: LibraryCard) => {
    // 1. 計算目前總牌數
    const totalCount = cards.reduce((acc, curr) => acc + curr.count, 0);
    
    // 限制總數不能超過 60
    if (totalCount >= 60) {
      alert("牌組已達 60 張上限！");
      return;
    }

    setCards((prevCards) => {
      // 2. 檢查這張卡片是否已經在牌組裡
      const existingCardIndex = prevCards.findIndex((c) => c.id === card.id);

      if (existingCardIndex > -1) {
        // 3. 如果已存在，檢查是否超過 4 張限制 (能量卡通常不限，這裡可依需求調整)
        const isBasicEnergy = card.category === "ENERGY" && card.subType === "Basic";
        if (!isBasicEnergy && prevCards[existingCardIndex].count >= 4) {
          alert("同名卡片（除基本能量外）最多只能放入 4 張！");
          return prevCards;
        }

        if (card.isAceSpec && prevCards[existingCardIndex].count >= 1) {
          alert("AceSpec 最多只能放入 1 張！");
          return prevCards;
        }

        // 複製陣列並更新特定卡片的數量
        const newCards = [...prevCards];
        newCards[existingCardIndex] = {
          ...newCards[existingCardIndex],
          count: newCards[existingCardIndex].count + 1,
        };
        return newCards;
      } else {
        // 4. 如果是新卡片，新增一個物件，初始 count 為 1
        // 只存入必要的資訊，避免 deckJson 過於龐大
        return [
          ...prevCards,
          {
            id: card.id,
            name: card.name,
            imageUrl: card.imageUrl, // 建議存入圖片 URL 方便左側清單顯示
            count: 1,
            category: card.category,
          },
        ];
      }
    });
  };

  const removeFromDeck = (cardId: number) => {
    setCards((prevCards) => {
      const existingCard = prevCards.find((c) => c.id === cardId);
      
      if (existingCard && existingCard.count > 1) {
        // 數量大於 1，則減 1
        return prevCards.map((c) =>
          c.id === cardId ? { ...c, count: c.count - 1 } : c
        );
      } else {
        // 數量為 1，直接從陣列移除
        return prevCards.filter((c) => c.id !== cardId);
      }
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左側：目前牌組內容 (1-60張) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <h2 className="font-bold mb-4 flex justify-between">
                牌組清單 <span>{cards.reduce((acc, curr) => acc + curr.count, 0)} / 60</span>
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
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
                        onClick={() => addToDeck(card)}
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-primary transition-colors"
                        title="增加數量"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeFromDeck(card.id)}
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
              {allCards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl border p-2 hover:shadow-md group">
                  <div className="aspect-[3/4] mb-2">
                    <Image src={card.imageUrl ?? ""} alt={card.name} className="w-full h-full object-contain" width={150} height={200} />
                  </div>
                  <p className="text-xs font-bold truncate">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground">{card.type} / {card.regulationMark}</p>
                  {/* 待實作：卡片加入卡組的按鈕 */}
                  <button 
                    onClick={() => addToDeck(card)} 
                    className="mt-2 w-full flex items-center justify-center gap-1 bg-primary text-white py-1 rounded-md hover:bg-primary/90 transition-colors text-xs"
                  >
                    <Plus className="w-3 h-3" /> 加入
                  </button>
                </div>
              ))}
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