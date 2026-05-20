"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPlaces } from "@/actions/geocode";
import type { GeocodePlace } from "@/lib/geocode";
import type { MapShopPin } from "./MeetMapClient";

const MAX_SHOP_RESULTS = 5;
const DEBOUNCE_MS = 400;

type Props = {
  shops: MapShopPin[];
  onSelectShop: (shop: MapShopPin) => void;
  onSelectPlace: (place: { lat: number; lng: number; label: string }) => void;
  disabled?: boolean;
  searchInputId?: string;
};

export function MapLocationSearch({
  shops,
  onSelectShop,
  onSelectPlace,
  disabled = false,
  searchInputId,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<GeocodePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = query.trim().toLowerCase();

  const matchedShops = useMemo(() => {
    if (q.length < 1) return [];
    return shops
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.addressNote?.toLowerCase().includes(q),
      )
      .slice(0, MAX_SHOP_RESULTS);
  }, [shops, q]);

  const showDropdown = open && query.trim().length >= 1;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setPlaces([]);
      setLoading(false);
      setGeoError(null);
      return;
    }

    setLoading(true);
    setGeoError(null);
    debounceRef.current = setTimeout(async () => {
      const result = await searchPlaces(query.trim());
      setLoading(false);
      if (!result.ok) {
        setGeoError(result.error);
        setPlaces([]);
        return;
      }
      setPlaces(result.places);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const clearAndClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setPlaces([]);
    setGeoError(null);
  }, []);

  function handleSelectShop(shop: MapShopPin) {
    onSelectShop(shop);
    clearAndClose();
  }

  function handleSelectPlace(place: GeocodePlace) {
    onSelectPlace({ lat: place.lat, lng: place.lng, label: place.label });
    clearAndClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative space-y-1">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id={searchInputId}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="map-location-search-listbox"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜尋卡店、地址或地標…"
          className="input-field w-full pl-10"
          autoComplete="off"
        />
      </div>

      {showDropdown ? (
        <div
          id="map-location-search-listbox"
          role="listbox"
          className="card absolute left-0 right-0 top-full z-[600] mt-1 max-h-72 overflow-y-auto p-1 shadow-lg"
        >
          {matchedShops.length > 0 ? (
            <div className="py-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                卡店
              </p>
              {matchedShops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  role="option"
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/[0.04]"
                  onClick={() => handleSelectShop(shop)}
                >
                  <span className="font-medium text-foreground">{shop.name}</span>
                  {shop.addressNote ? (
                    <span className="text-xs text-muted-foreground">{shop.addressNote}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {q.length >= 2 ? (
            <div className="border-t border-black/[0.06] py-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                地點
              </p>
              {loading ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">搜尋中…</p>
              ) : geoError ? (
                <p className="px-3 py-2 text-sm text-amber-700">{geoError}</p>
              ) : places.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">找不到相符地點</p>
              ) : (
                places.map((place, i) => (
                  <button
                    key={`${place.lat}-${place.lng}-${i}`}
                    type="button"
                    role="option"
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/[0.04]"
                    onClick={() => handleSelectPlace(place)}
                  >
                    <span className="font-medium text-foreground">{place.label}</span>
                    {place.subtitle ? (
                      <span className="text-xs text-muted-foreground">{place.subtitle}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}

          <p className="border-t border-black/[0.06] px-3 py-2 text-[10px] text-muted-foreground">
            地點搜尋 ©{" "}
            <a
              href="https://nominatim.openstreetmap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Nominatim
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
