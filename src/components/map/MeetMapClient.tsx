"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Circle,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  campfireIcon,
  ownCampfireIcon,
  previewPinIcon,
  legendShopSvg,
  legendPlayerSvg,
  shopIconWithCount,
} from "./mapIcons";

export type MapFlyToTarget = {
  lat: number;
  lng: number;
  zoom?: number;
  key?: number;
};

export type MapPreviewPin = {
  lat: number;
  lng: number;
  label: string;
};

export type MapShopPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  addressNote?: string;
  lobbyCount?: number;
  hasPtcgBattleArea?: boolean;
  hoursJson?: string;
  openNow?: boolean;
};

export type MapAnnouncementPin = {
  spotId: string;
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  lat: number;
  lng: number;
  label: string;
  playNote?: string;
  expiresAt?: string;
  isOwn?: boolean;
};

type Props = {
  shops: MapShopPin[];
  announcements: MapAnnouncementPin[];
  center: LatLngExpression;
  zoom?: number;
  /** Fixed pixel height; ignored when {@link fillHeight} is true. */
  height?: number;
  /** Stretch the map vertically inside a flex/grid parent (desktop alignment with sibling column). */
  fillHeight?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onShopClick?: (shop: MapShopPin) => void;
  onAnnouncementClick?: (spotId: string) => void;
  clickHint?: string;
  showLegend?: boolean;
  flyTo?: MapFlyToTarget | null;
  previewPin?: MapPreviewPin | null;
  onRefresh?: () => void;
  /** Show a circle on the map representing a search radius */
  radiusCircle?: {
    centerLat: number;
    centerLng: number;
    radiusKm: number;
  } | null;
  /** Called when map center changes (drag/pan/zoom) */
  onMapCenterChange?: (lat: number, lng: number) => void;
};

function MapFlyTo({ target }: { target?: MapFlyToTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 15, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function MapClickLayer({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterTracker({
  onMapCenterChange,
}: {
  onMapCenterChange?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const cb = useRef(onMapCenterChange);
  cb.current = onMapCenterChange;

  useEffect(() => {
    const onMove = () => {
      const center = map.getCenter();
      const fixedLat = Math.round(center.lat * 1000000) / 1000000;
      const fixedLng = Math.round(center.lng * 1000000) / 1000000;
      
      cb.current?.(fixedLat, fixedLng);
    };
    
    map.on("moveend", onMove);
    map.on("zoomend", onMove);
    return () => {
      map.off("moveend", onMove);
      map.off("zoomend", onMove);
    };
  }, [map]);
  return null;
}

function MapInvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const view = map.getContainer().closest<HTMLElement>(`.meet-map-viewport-root`);
    if (!view) return;

    map.invalidateSize();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(view);

    const onWin = () => map.invalidateSize();
    window.addEventListener("orientationchange", onWin);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", onWin);
    };
  }, [map]);
  return null;
}

function MapRefreshControl({ onRefresh }: { onRefresh?: () => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (!onRefresh) return;

    const RefreshControl = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create("div");
        container.className = "leaflet-bar"; // 保持 Leaflet 的外框與陰影

        // 💡 修改點：移除 "leaflet-control-zoom-in"，改用自訂樣式避免 CSS 衝突
        const button = L.DomUtil.create("a", "", container);
        button.href = "#";
        button.title = "重整地圖";
        
        // 讓按鈕外觀看起來跟 Leaflet 原生按鈕一致
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.style.width = "30px";
        button.style.height = "30px";
        button.style.backgroundColor = "#fff";
        button.style.color = "#333"; // 💡 設定 SVG 的 currentColor 顏色
        button.style.cursor = "pointer";
        button.style.transition = "background-color 0.2s";

        // 加上 Hover 效果，讓它滑過去時像原生按鈕一樣變色
        button.onmouseover = () => { button.style.backgroundColor = "#f4f4f4"; };
        button.onmouseout = () => { button.style.backgroundColor = "#fff"; };

        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg"); // 💡 建議用 createElementNS 確保 SVG 在 DOM 中正常渲染
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "2");
        icon.setAttribute("stroke-linecap", "round");
        icon.setAttribute("stroke-linejoin", "round");
        icon.style.width = "16px";
        icon.style.height = "16px";
        icon.innerHTML = '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>';
        
        button.appendChild(icon);

        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          onRefresh?.();
        });

        L.DomEvent.on(button, "dblclick", L.DomEvent.stopPropagation);

        return container;
      },
    });

    const refreshControl = new RefreshControl({ position: "topleft" });
    refreshControl.addTo(map);

    return () => {
      refreshControl.remove();
    };
  }, [map, onRefresh]);

  return null;
}

export function MeetMapClient({
  shops,
  announcements,
  center,
  zoom = 13,
  height = 320,
  fillHeight = false,
  onMapClick,
  onShopClick,
  onAnnouncementClick,
  clickHint,
  showLegend = true,
  flyTo,
  previewPin,
  onRefresh,
  radiusCircle = null,
  onMapCenterChange,
}: Props) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
  }, []);

  const markerLayers = (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFlyTo target={flyTo} />
      <MapClickLayer onMapClick={onMapClick} />
      <MapCenterTracker onMapCenterChange={onMapCenterChange} />
      <MapRefreshControl onRefresh={onRefresh} />
      {radiusCircle ? (
        <Circle
          center={[radiusCircle.centerLat, radiusCircle.centerLng]}
          radius={radiusCircle.radiusKm * 1000} // Convert km to meters
          pathOptions={{
            color: "hsl(var(--primary))",
            weight: 2,
            opacity: 0.3,
            fill: true,
            fillColor: "hsl(var(--primary))",
            fillOpacity: 0.08,
          }}
        />
      ) : null}
      {previewPin ? (
        <Marker position={[previewPin.lat, previewPin.lng]} icon={previewPinIcon}>
          <Popup>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">
                {previewPin.label.trim() ? previewPin.label : "選取的位置"}
              </p>
              <p className="text-xs text-muted-foreground">
                {previewPin.lat.toFixed(5)}, {previewPin.lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      ) : null}
      {shops.map((s) => (
        <Marker
          key={`shop-${s.id}`}
          position={[s.lat, s.lng]}
          icon={shopIconWithCount(s.lobbyCount)}
          eventHandlers={{
            click: () => onShopClick?.(s),
          }}
        >
          <Popup>
            <strong>{s.name}</strong>
            {s.lobbyCount && s.lobbyCount > 0 ? (
              <div className="text-xs text-primary">{s.lobbyCount} 人在此公告</div>
            ) : null}
            {s.addressNote ? <div className="text-xs text-gray-600">{s.addressNote}</div> : null}
          </Popup>
        </Marker>
      ))}
      {announcements.map((a) => (
        <Marker
          key={`ann-${a.spotId}`}
          position={[a.lat, a.lng]}
          icon={a.isOwn ? ownCampfireIcon : campfireIcon}
          eventHandlers={{
            click: () => onAnnouncementClick?.(a.spotId),
          }}
        >
          <Popup>
            <strong>{a.displayName}</strong>
            <div className="text-xs text-muted-foreground">{a.label}</div>
            {a.playNote ? <p className="mt-1 text-xs line-clamp-3">{a.playNote}</p> : null}
            {a.expiresAt ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                公告至 {new Date(a.expiresAt).toLocaleString("zh-Hant", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </>
  );

  return (
    <div
      className={
        fillHeight
          ? "flex h-full min-h-[280px] flex-1 flex-col lg:min-h-0"
          : "space-y-2"
      }
    >
      {fillHeight ? (
        <div className="meet-map-viewport-root relative flex min-h-[220px] w-full flex-1 flex-col overflow-hidden">
          {clickHint ? (
            <p className="absolute bottom-2 left-2 right-2 z-[500] rounded bg-black/65 px-2 py-1 text-center text-xs text-white">
              {clickHint}
            </p>
          ) : null}
          <div className="relative min-h-0 w-full flex-1">
            <MapContainer
              center={center}
              zoom={zoom}
              className="z-0"
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <MapInvalidateOnResize />
              {markerLayers}
            </MapContainer>
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-inner">
          {clickHint ? (
            <p className="absolute bottom-2 left-2 right-2 z-[500] rounded bg-black/65 px-2 py-1 text-center text-xs text-white">
              {clickHint}
            </p>
          ) : null}
          <div style={{ height }} className="w-full">
            <MapContainer
              center={center}
              zoom={zoom}
              className="z-0"
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              {markerLayers}
            </MapContainer>
          </div>
        </div>
      )}
      {showLegend ? (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-flex shrink-0 items-center justify-center"
              dangerouslySetInnerHTML={{ __html: legendShopSvg }}
            />
            卡店（店家大廳）
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-flex shrink-0 items-center justify-center"
              dangerouslySetInnerHTML={{ __html: legendPlayerSvg }}
            />
            玩家自訂地點
          </span>
        </div>
      ) : null}
    </div>
  );
}
