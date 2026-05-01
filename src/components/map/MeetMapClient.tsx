"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapShopPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  addressNote?: string;
};

export type MapPeerPin = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  shops: MapShopPin[];
  peers: MapPeerPin[];
  center: LatLngExpression;
  zoom?: number;
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
  clickHint?: string;
};

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
  peers,
  center,
  zoom = 13,
  height = 320,
  onMapClick,
  clickHint,
}: Props) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  return (
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
          <MapClickLayer onMapClick={onMapClick} />
          {shops.map((s) => (
            <Marker key={`shop-${s.id}`} position={[s.lat, s.lng]}>
              <Popup>
                <strong>{s.name}</strong>
                {s.addressNote ? (
                  <div className="text-xs text-gray-600">{s.addressNote}</div>
                ) : null}
              </Popup>
            </Marker>
          ))}
          {peers.map((p) => (
            <Marker key={`peer-${p.userId}`} position={[p.lat, p.lng]}>
              <Popup>
                <strong>{p.displayName}</strong>
                <div className="text-xs">{p.label}</div>
                <div className="mt-2">
                  <Link
                    href={`/profile/${p.userId}`}
                    className="text-xs font-semibold text-primary underline underline-offset-2"
                  >
                    查看個人檔案
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
