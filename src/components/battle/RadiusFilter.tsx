"use client";

import { useCallback } from "react";

type Props = {
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
};

export function RadiusFilter({ radiusKm, onRadiusChange }: Props) {
  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onRadiusChange(parseFloat(e.target.value));
    },
    [onRadiusChange]
  );

  return (
    <div className="card flex min-w-0 flex-col gap-2 rounded-2xl p-4">
      <label htmlFor="radius-filter" className="text-xs font-medium text-muted-foreground">
        篩選範圍：
      </label>
      <div className="flex items-center gap-2">
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
        <span className="text-xs font-medium text-foreground text-right whitespace-nowrap">
          <div className="whitespace-nowrap">{radiusKm.toFixed(1)} km</div>
        </span>
      </div>
    </div>
  );
}
