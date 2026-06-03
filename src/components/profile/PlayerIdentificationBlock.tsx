import Image from "next/image";
import { UserRound } from "lucide-react";
import { ageLabel, genderLabel } from "@/lib/profile";

export type PlayerIdentificationView = {
  displayName: string;
  avatarUrl?: string | null;
  gender?: string | null;
  age?: number | null;
};

type Props = {
  player: PlayerIdentificationView;
  /** Compact layout for strips and ceremony overlays */
  compact?: boolean;
  className?: string;
};

export function PlayerIdentificationBlock({
  player,
  compact = false,
  className = "",
}: Props) {
  const gender = genderLabel(player.gender);
  const age = ageLabel(player.age);
  const avatarSize = compact ? "h-12 w-12" : "h-16 w-16";
  const iconSize = compact ? "h-6 w-6" : "h-8 w-8";

  return (
    <div className={`flex gap-3 ${className}`}>
      <div
        className={`relative ${avatarSize} shrink-0 overflow-hidden rounded-full border-2 border-border bg-neutral-100`}
      >
        {player.avatarUrl ? (
          <Image
            src={player.avatarUrl}
            alt={`${player.displayName}的大頭貼`}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <UserRound className={iconSize} strokeWidth={1.5} aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}>
          {player.displayName}
        </p>
        {(gender || age) && (
          <p className="text-xs text-muted-foreground">
            {[gender, age].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
