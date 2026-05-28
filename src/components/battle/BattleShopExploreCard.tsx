"use client";

import { useState, useMemo } from "react";
import { MapLocationSearch } from "@/components/map/MapLocationSearch";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { BattleNearbyPlayersList } from "@/components/battle/BattleNearbyPlayersList";
import { BattleShopList } from "@/components/battle/BattleShopList";
import { submitShopReport } from "@/actions/shops";

type Props = {
  shops: MapShopPin[];
  announcements: MapAnnouncementDTO[];
  hideShopList: boolean;
  onSelectShop: (shop: MapShopPin) => void;
  onSelectPlace: (place: { lat: number; lng: number; label: string }) => void;
  onSelectAnnouncement: (announcement: MapAnnouncementDTO) => void;
  mapCenterLat?: number;
  mapCenterLng?: number;
  radiusKm?: number;
  onRadiusChange?: (radiusKm: number) => void;
  activeTab?: "players" | "shops";
  onActiveTabChange?: (tab: "players" | "shops") => void;
};

// Calculate distance between two coordinates (in km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function BattleShopExploreCard({
  shops,
  announcements,
  hideShopList,
  onSelectShop,
  onSelectPlace,
  onSelectAnnouncement,
  mapCenterLat = 25.033,
  mapCenterLng = 121.565,
  radiusKm = 5,
  activeTab,
  onActiveTabChange,
}: Props) {
  const [localTab, setLocalTab] = useState<"players" | "shops">("players");
  const tab = activeTab ?? localTab;
  const setTab = (t: "players" | "shops") => {
    setLocalTab(t);
    onActiveTabChange?.(t);
  };
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestAddress, setSuggestAddress] = useState("");
  const [suggestNote, setSuggestNote] = useState("");
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  async function handleSuggestSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!suggestName.trim()) { setSuggestError("請填寫店家名稱"); return; }
    setSuggestSubmitting(true);
    setSuggestError("");
    try {
      await submitShopReport({ type: "MISSING", shopName: suggestName, address: suggestAddress, note: suggestNote });
      setSuggestSubmitted(true);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setSuggestSubmitting(false);
    }
  }

  function handleSuggestClose() {
    setSuggestOpen(false);
    setSuggestSubmitted(false);
    setSuggestError("");
    setSuggestName("");
    setSuggestAddress("");
    setSuggestNote("");
  }

  // Determine available content
  const hasOtherPlayers = announcements.length > 0;
  const canShowShops = !hideShopList;

  const filteredAnnouncements = useMemo(() => {
    if (announcements.length === 0) return [];
    
    return announcements.filter(ann => {
      const distance = calculateDistance(mapCenterLat, mapCenterLng, ann.lat, ann.lng);
      return distance <= radiusKm;
    });
  }, [announcements, radiusKm, mapCenterLat, mapCenterLng]);

  // Filter shops by radius and sort by distance
  const filteredShops = useMemo(() => {
    if (shops.length === 0) return [];
    return shops
      .map(shop => ({ shop, dist: calculateDistance(mapCenterLat, mapCenterLng, shop.lat, shop.lng) }))
      .filter(({ dist }) => dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist)
      .map(({ shop }) => shop);
  }, [shops, radiusKm, mapCenterLat, mapCenterLng]);

  return (
    <div className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          {tab === "players" ? "公開大廳－附近玩家" : "公開大廳－附近店家"}
        </h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setTab("players")}
            className={`px-2.5 py-1 rounded transition-colors ${
              tab === "players"
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            玩家
          </button>
          <button
            onClick={() => setTab("shops")}
            className={`px-2.5 py-1 rounded transition-colors ${
              tab === "shops"
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            店家
          </button>
        </div>
      </div>

      <MapLocationSearch
        shops={shops}
        onSelectShop={onSelectShop}
        onSelectPlace={onSelectPlace}
      />

      {/* Players content */}
      {tab === "players" && (
        <div className="flex flex-col">
          {filteredAnnouncements.length > 0 ? (
            <BattleNearbyPlayersList
              announcements={filteredAnnouncements}
              onSelect={onSelectAnnouncement}
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
              {hasOtherPlayers ? "該範圍內沒有玩家" : "目前沒有其他玩家"}
            </div>
          )}
        </div>
      )}

      {/* Shops content */}
      {tab === "shops" && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className="self-start rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            + 建議新增店家
          </button>

          {filteredShops.length > 0 ? (
            <BattleShopList
              shops={filteredShops}
              onSelectShop={onSelectShop}
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
              {canShowShops ? "該範圍內沒有店家" : "目前沒有店家"}
            </div>
          )}
        </div>
      )}

      {/* 建議新增店家 dialog */}
      {suggestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            {suggestSubmitted ? (
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium text-foreground">感謝建議！我們會確認後加入名單。</p>
                <button
                  type="button"
                  onClick={handleSuggestClose}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white"
                >
                  關閉
                </button>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">建議新增店家</h2>

                <input
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="店家名稱（必填）"
                  maxLength={100}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  value={suggestAddress}
                  onChange={(e) => setSuggestAddress(e.target.value)}
                  placeholder="地址（選填）"
                  maxLength={200}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <textarea
                  value={suggestNote}
                  onChange={(e) => setSuggestNote(e.target.value)}
                  placeholder="備註（選填，例如：有道館賽、週末有活動）"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />

                {suggestError && <p className="text-xs text-red-500">{suggestError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSuggestClose}
                    className="flex-1 rounded-lg border border-border py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={suggestSubmitting}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {suggestSubmitting ? "送出中…" : "送出"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
