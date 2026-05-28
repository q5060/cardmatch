import { MapPin, Navigation } from "lucide-react";
import {
  formatCoordinates,
  googleMapsNavUrl,
  googleMapsViewUrl,
  isValidCoordinates,
} from "@/lib/maps";

type Props = {
  label: string;
  lat: number;
  lng: number;
  className?: string;
  /** Hide duplicate label line when parent already shows it. */
  showLabel?: boolean;
};

export function LocationNavBlock({
  label,
  lat,
  lng,
  className = "",
  showLabel = true,
}: Props) {
  if (!isValidCoordinates(lat, lng)) return null;

  const coords = formatCoordinates(lat, lng);
  const navUrl = googleMapsNavUrl(lat, lng);
  const viewUrl = googleMapsViewUrl(lat, lng);

  return (
    <div
      className={`rounded-lg border border-border bg-black/[0.02] px-3 py-2.5 ${className}`}
    >
      {showLabel && label.trim() ? (
        <p className="flex items-start gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>{label}</span>
        </p>
      ) : null}
      <p
        className={`font-mono text-xs text-muted-foreground ${showLabel && label.trim() ? "mt-1.5" : ""}`}
      >
        {coords}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden />
          Google 地圖導航
        </a>
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          在地圖中查看
        </a>
      </div>
    </div>
  );
}
