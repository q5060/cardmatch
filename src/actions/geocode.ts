"use server";

import { getSession } from "@/lib/auth";
import {
  MAX_GEOCODE_RESULTS,
  MIN_QUERY_LEN,
  NOMINATIM_SEARCH_URL,
  normalizeNominatimResult,
  type GeocodePlace,
  type NominatimSearchResult,
} from "@/lib/geocode";

const NOMINATIM_USER_AGENT =
  "CardMatch/1.0 (https://github.com/cardmatch; contact: dev@localhost)";

let lastRequestAt = 0;

export type SearchPlacesResult =
  | { ok: true; places: GeocodePlace[] }
  | { ok: false; error: string; places: GeocodePlace[] };

export async function searchPlaces(query: string): Promise<SearchPlacesResult> {
  const session = await getSession();
  if (!session.userId) {
    return { ok: false, error: "請先登入", places: [] };
  }

  const q = query.trim();
  if (q.length < MIN_QUERY_LEN) {
    return { ok: true, places: [] };
  }

  const now = Date.now();
  const waitMs = 1000 - (now - lastRequestAt);
  if (waitMs > 0) {
    await new Promise((r) => setTimeout(r, waitMs));
  }
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: String(MAX_GEOCODE_RESULTS),
    countrycodes: "tw",
    "accept-language": "zh-TW,zh,en",
  });

  try {
    const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { ok: false, error: "搜尋暫時無法使用", places: [] };
    }

    const rows = (await res.json()) as NominatimSearchResult[];
    if (!Array.isArray(rows)) {
      return { ok: false, error: "搜尋暫時無法使用", places: [] };
    }

    return {
      ok: true,
      places: rows.map(normalizeNominatimResult),
    };
  } catch {
    return { ok: false, error: "搜尋暫時無法使用", places: [] };
  }
}
