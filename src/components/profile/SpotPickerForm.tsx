"use client";

import { useState } from "react";
import { MeetMap, type MapShopPin, type MapPeerPin } from "@/components/map/MeetMap";
import { createMeetSpot } from "@/actions/meetSpot";

type Props = {
  shops: MapShopPin[];
};

export function SpotPickerForm({ shops }: Props) {
  const [lat, setLat] = useState(25.033);
  const [lng, setLng] = useState(121.565);
  const peers: MapPeerPin[] = [];

  return (
    <div className="space-y-5">
      <MeetMap
        shops={shops}
        peers={peers}
        center={[lat, lng]}
        zoom={13}
        height={280}
        onMapClick={(la, ln) => {
          setLat(Number(la.toFixed(5)));
          setLng(Number(ln.toFixed(5)));
        }}
        clickHint="點擊地圖設定座標（方便約戰的地點）"
      />
      <form action={createMeetSpot} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <label className="block text-sm font-medium text-foreground sm:col-span-2">
          <span className="text-muted-foreground">地點名稱</span>
          <input
            name="label"
            required
            placeholder="例：XX 卡店門口、咖啡廳"
            className="input-field mt-2"
          />
        </label>
        <label className="block text-sm font-medium text-foreground sm:col-span-2">
          <span className="text-muted-foreground">方便時段（文字）</span>
          <input
            name="timeNote"
            placeholder="例：週六 14:00–18:00"
            className="input-field mt-2"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground sm:col-span-2">
          <input
            type="checkbox"
            name="looking"
            className="rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          />
          在大廳公開「正在找人對戰」（同一時間僅一個地點可公開）
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          目前座標：{lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <button type="submit" className="btn btn-secondary sm:col-span-2">
          新增約戰地點
        </button>
      </form>
    </div>
  );
}
