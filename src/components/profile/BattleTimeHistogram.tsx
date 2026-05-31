"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";

export function BattleTimeHistogram({
  activityByHour,
}: {
  activityByHour: Record<number, number>;
}) {
  const { bars, max } = useMemo(() => {
    const data: { hour: number; count: number }[] = [];
    let maxCount = 1;

    for (let h = 0; h < 24; h++) {
      const count = activityByHour[h] ?? 0;
      if (count > maxCount) maxCount = count;
      data.push({ hour: h, count });
    }

    return { bars: data, max: maxCount };
  }, [activityByHour]);

  const barHeightPercent = (count: number) => {
    if (max === 0) return 0;
    return (count / max) * 100;
  };

  const getBarColor = (count: number): string => {
    if (count === 0) return "bg-neutral-200";
    const ratio = count / max;
    if (ratio <= 0.25) return "bg-primary/25";
    if (ratio <= 0.5) return "bg-primary/45";
    if (ratio <= 0.75) return "bg-primary/70";
    return "bg-primary";
  };

return (
  <div className="card card-hover p-4 w-full overflow-hidden">
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-semibold text-foreground">對戰時間分布</h3>
    </div>
    
    <div className="w-full flex items-end justify-between gap-[1px] sm:gap-0.5">
      {bars.map((bar) => {
        const shouldShowLabel = bar.hour % 2 === 0;

        return (
          <div
            key={bar.hour}
            className="flex-1 flex flex-col items-center min-w-0"
            title={`${bar.hour}:00 - ${bar.count} 場`}
          >
            <div className="w-full flex items-end justify-center h-20 mb-1">
              <div
                className={`w-full rounded-sm transition-all ${getBarColor(bar.count)}`}
                style={{ height: `${Math.max(barHeightPercent(bar.count), 2)}%` }}
                role="img"
                aria-label={`${bar.hour}:00 時段 ${bar.count} 場對戰`}
              />
            </div>
            
            <span className="text-[10px] text-muted-foreground font-medium tabular-nums h-4 flex items-center justify-center">
              {shouldShowLabel ? String(bar.hour).padStart(2, "0") : "\u00A0"}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);
}
