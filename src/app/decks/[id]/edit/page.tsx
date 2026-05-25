"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Settings, Search, Plus, Trash2 } from "lucide-react";

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

  // Hook 2：抓取全卡片資料庫 (只在掛載時執行一次)
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await fetch('/api/cards');
        const data = await res.json();
        setAllCards(data);
      } catch (err) {
        console.error("卡庫載入失敗", err);
      } finally {
        setLibLoading(false);
      }
    };
    fetchLibrary();
  }, []);

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
                      <button className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右側：卡片資料庫搜尋 [cite: 26, 27, 28, 29, 30, 31] */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="搜尋卡片名稱、屬性或賽制標記..." 
                  className="input-field pl-10"
                />
              </div>
              <select className="input-field w-32">
                <option>全部</option>
                <option>寶可夢</option>
                <option>訓練家</option>
                <option>能量</option>
              </select>
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
                  <button onClick={() => addToDeck(card)} className="...">
                    <Plus className="w-3 h-3" /> 加入
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}