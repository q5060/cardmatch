"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  shopBaseIcon,
  campfireIcon,
  ownCampfireIcon,
  previewPinIcon,
  legendShopSvg,
  legendPlayerSvg,
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
};

export type MapAnnouncementPin = {
  spotId: string;
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  lat: number;
  lng: number;
  label: string;
  isOwn?: boolean;
};

type Props = {
  shops: MapShopPin[];
  announcements: MapAnnouncementPin[];
  center: LatLngExpression;
  zoom?: number;
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onShopClick?: (shop: MapShopPin) => void;
  onAnnouncementClick?: (spotId: string) => void;
  clickHint?: string;
  showLegend?: boolean;
  flyTo?: MapFlyToTarget | null;
  previewPin?: MapPreviewPin | null;
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

export function MeetMapClient({
  shops,
  announcements,
  center,
  zoom = 13,
  height = 320,
  onMapClick,
  onShopClick,
  onAnnouncementClick,
  clickHint,
  showLegend = true,
  flyTo,
  previewPin,
}: Props) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
  }, []);

  return (
    <div className="space-y-2">
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
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo target={flyTo} />
            <MapClickLayer onMapClick={onMapClick} />
            {previewPin ? (
              <Marker position={[previewPin.lat, previewPin.lng]} icon={previewPinIcon}>
                <Popup>
                  <strong>預覽地點</strong>
                  <div className="text-xs">{previewPin.label}</div>
                </Popup>
              </Marker>
            ) : null}
            {shops.map((s) => (
              <Marker
                key={`shop-${s.id}`}
                position={[s.lat, s.lng]}
                icon={shopBaseIcon}
                eventHandlers={{
                  click: () => onShopClick?.(s),
                }}
              >
                <Popup>
                  <strong>{s.name}</strong>
                  {s.addressNote ? (
                    <div className="text-xs text-gray-600">{s.addressNote}</div>
                  ) : null}
                  {/* {onShopClick ? (
                    <p className="mt-1 text-xs text-primary">點擊進入店家大廳</p>
                  ) : null} */}
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
                  <div className="text-xs">{a.label}</div>
                  {onAnnouncementClick ? (
                    <p className="mt-1 text-xs text-primary">點擊查看約戰需求</p>
                  ) : null}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      {showLegend ? (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-flex shrink-0 items-center justify-center"
              dangerouslySetInnerHTML={{ __html: legendShopSvg }}
            />
            藍色釘：卡店（店家大廳）
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-flex shrink-0 items-center justify-center"
              dangerouslySetInnerHTML={{ __html: legendPlayerSvg }}
            />
            綠色釘：玩家自選地點
          </span>
        </div>
      ) : null}
    </div>
  );
}
