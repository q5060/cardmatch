"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Settings, Search, Plus, Minus } from "lucide-react";

// 定義 Deck 介面，包含 deckJson 
interface Deck {
  id: string;
  title: string;
  deckJson: string | null;
}

export default function DeckCompositionEditor() {
  const router = useRouter();
  const { id } = useParams();
  
  // 狀態管理
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<any[]>([]); // 牌組內的卡片
  const [allCards, setAllCards] = useState<any[]>([]); // 資料庫全卡片
  const [loading, setLoading] = useState(true);
  const [libLoading, setLibLoading] = useState(true); // 新增卡庫載入狀態
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);       // 追蹤目前抓到第幾頁
  const [hasMore, setHasMore] = useState(true); // 追蹤是否還有更多資料

  // Hook 1：抓取特定牌組資料
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

  // 修改後的抓取函式
  const fetchLibrary = async (targetPage: number, append = false) => {
    setLibLoading(true);
    try {
    // 組建查詢字串
    const params = new URLSearchParams({
      page: targetPage.toString(),
      limit: "20",
      category: filters.category,
      type: filters.type,
      stage: filters.stage,
      search: filters.search
    });
    
      const res = await fetch(`/api/cards?${params.toString()}`);
      const data = await res.json();
      
      // ✨ 增加檢查：確保 data.cards 是陣列才更新狀態
    if (data && Array.isArray(data.cards)) {
      if (append) {
        setAllCards(prev => [...(prev || []), ...data.cards]);
      } else {
        setAllCards(data.cards);
      }
      setHasMore(data.hasMore);
    } else {
      // 如果格式不對，設定為空陣列避免報錯
      console.error("API 回傳格式錯誤:", data);
      if (!append) setAllCards([]); 
    }
  } catch (err) {
    console.error("載入失敗", err);
  } finally {
    setLibLoading(false);
  }
};
  // 初次掛載
  useEffect(() => {
    fetchLibrary(1);
  }, []);

  // 處理載入更多按鈕
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLibrary(nextPage, true);
  };

  // 卡牌篩選條件
  const [filters, setFilters] = useState({
    category: "ALL",
    type: "",
    stage: "",
    search: ""
  });

  // 當篩選條件改變時，重置頁數並執行重新抓取
  useEffect(() => {
    setPage(1); // 重置為第一頁
    fetchLibrary(1, false); // false 表示替換舊資料而不是接續
  }, [filters]);

  // 加入卡片到牌組
  const addToDeck = (card: any) => {
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
        const isBasicEnergy = card.category === "ENERGY" && !card.name.includes("特殊");
        if (!isBasicEnergy && prevCards[existingCardIndex].count >= 4) {
          alert("同名卡片（除基本能量外）最多只能放入 4 張！");
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

  const removeFromDeck = (cardId: string) => {
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
      const formData = new FormData();
      formData.append("deckJson", JSON.stringify(cards));
      
      // 使用現有的 updateDeck action 或 API
      const res = await fetch(`/api/decks/${id}/composition`, {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        router.refresh();
        alert("牌組組成已儲存");
      }
    } catch (err) {
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
              href={`/decks/${id}/settings`} 
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
                目前清單 <span>{cards.reduce((acc, curr) => acc + curr.count, 0)} / 60</span>
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
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
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
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
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
                      onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
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
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>    

            {/* 卡片網格展示區域 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allCards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl border p-2 hover:shadow-md group">
                  <div className="aspect-[3/4] mb-2">
                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain" />
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