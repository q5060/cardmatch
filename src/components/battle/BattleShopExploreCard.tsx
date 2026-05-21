"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { MapLocationSearch } from "@/components/map/MapLocationSearch";
import type { MapShopPin } from "@/components/map/MeetMap";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { BattleNearbyPlayersList } from "@/components/battle/BattleNearbyPlayersList";
import { BattleShopList } from "@/components/battle/BattleShopList";

type Props = {
  shops: MapShopPin[];
  announcements: MapAnnouncementDTO[];
  hideShopList: boolean;
  onSelectShop: (shop: MapShopPin) => void;
  onSelectPlace: (place: { lat: number; lng: number; label: string }) => void;
  onSelectAnnouncement: (announcement: MapAnnouncementDTO) => void;
  mapCenterLat?: number;
  mapCenterLng?: number;
  onRadiusChange?: (lat: number, lng: number, radiusKm: number) => void;
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
  onRadiusChange,
}: Props) {
  const [radiusKm, setRadiusKm] = useState(5); // Default 5 km radius
  const [tab, setTab] = useState<"players" | "shops">("players");
  
  // Determine available content
  const hasOtherPlayers = announcements.length > 0;
  const canShowShops = !hideShopList;

  // Handle radius change with useCallback to avoid infinite updates
  const handleRadiusChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRadiusKm(parseFloat(e.target.value));
  }, []);

  // Notify parent about radius change
  useEffect(() => {
    onRadiusChange?.(mapCenterLat, mapCenterLng, radiusKm);
  }, [radiusKm, mapCenterLat, mapCenterLng, onRadiusChange]);

  // Filter announcements by radius (use map center as reference point)
  const filteredAnnouncements = useMemo(() => {
    if (announcements.length === 0) return [];
    
    return announcements.filter(ann => {
      const distance = calculateDistance(mapCenterLat, mapCenterLng, ann.lat, ann.lng);
      return distance <= radiusKm;
    });
  }, [announcements, radiusKm, mapCenterLat, mapCenterLng]);

  // Filter shops by radius (use map center as reference point)
  const filteredShops = useMemo(() => {
    if (shops.length === 0) return [];
    
    return shops.filter(shop => {
      const distance = calculateDistance(mapCenterLat, mapCenterLng, shop.lat, shop.lng);
      return distance <= radiusKm;
    });
  }, [shops, radiusKm, mapCenterLat, mapCenterLng]);

  return (
    <div className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          {tab === "players" ? "附近玩家" : "附近店家"}
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

      {/* Radius filter - show when we have content to filter */}
      {(hasOtherPlayers || !hideShopList) && (
        <div className="flex items-center gap-2">
          <label htmlFor="radius-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            篩選範圍：
          </label>
          <input
            id="radius-filter"
            type="range"
            min="0.5"
            max="50"
            step="0.5"
            value={radiusKm}
            onChange={handleRadiusChange}
            className="flex-1"
          />
          <span className="text-xs font-medium text-foreground whitespace-nowrap w-12 text-right">
            {radiusKm.toFixed(1)} km
          </span>
        </div>
      )}

      {/* Players content */}
      {tab === "players" && (
        <div className="min-h-[352px] flex flex-col" style={{ minHeight: "calc(3 * 110px + 16px)" }}>
          
          {/* 只有當有資料時才渲染列表 */}
          {filteredAnnouncements.length > 0 ? (
            <BattleNearbyPlayersList 
              announcements={filteredAnnouncements} 
              onSelect={onSelectAnnouncement} 
            />
          ) : (
            /* 沒有資料時，讓這個 div 用 flex-1 填滿剩下的高度並置中內容 */
            <div className="text-sm text-muted-foreground flex-1 flex items-center justify-center">
              {hasOtherPlayers ? "該範圍內沒有玩家" : "目前沒有其他玩家"}
            </div>
          )}
          
        </div>
      )}

      {/* Shops content */}
      {tab === "shops" && (
        <div className="min-h-[352px] flex flex-col" style={{ minHeight: "calc(3 * 110px + 16px)" }}>
          
          {/* 只有當有店家資料時才渲染列表 */}
          {filteredShops.length > 0 ? (
            <BattleShopList 
              shops={filteredShops} 
              onSelectShop={onSelectShop} 
            />
          ) : (
            /* 沒有店家時，讓這個 div 用 flex-1 撐滿整個容器並垂直、水平置中文字 */
            <div className="text-sm text-muted-foreground flex-1 flex items-center justify-center">
              {canShowShops ? "該範圍內沒有店家" : "目前沒有店家"}
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
