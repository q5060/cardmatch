export const MIN_QUERY_LEN = 2;
export const MAX_GEOCODE_RESULTS = 5;
export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export type GeocodePlace = {
  lat: number;
  lng: number;
  label: string;
  subtitle?: string;
};

export type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
};

export function normalizeNominatimResult(row: NominatimSearchResult): GeocodePlace {
  const lat = parseFloat(row.lat);
  const lng = parseFloat(row.lon);
  const parts = row.display_name.split(",").map((p) => p.trim());
  const label = row.name?.trim() || parts[0] || row.display_name;
  const subtitle =
    parts.length > 1 ? parts.slice(1, 4).join("，") : undefined;

  return { lat, lng, label, subtitle };
}
