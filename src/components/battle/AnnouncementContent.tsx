"use client";

import { useState } from "react";
import Link from "next/link";
import type { MapAnnouncementDTO } from "@/lib/queries";
import { formatExpiresAt } from "@/lib/format";
import { parsePlayFormat, PLAY_FORMAT_LABELS } from "@/lib/playFormat";
import { LocationNavBlock } from "@/components/ui/LocationNavBlock";
import { PlayerIdentificationBlock } from "@/components/profile/PlayerIdentificationBlock";
import { DeckPickerField } from "@/components/battle/DeckPickerField";
import { DisclosedDeckViewer } from "@/components/battle/DisclosedDeckViewer";

type Props = {
  announcement: MapAnnouncementDTO;
  isOwn: boolean;
  pending?: boolean;
  onInvite?: (inviterDeckId: string | null) => void;
  onClear?: () => void;
};

export function AnnouncementContent({
  announcement,
  isOwn,
  pending,
  onInvite,
  onClear,
}: Props) {
  const [inviteDeckId, setInviteDeckId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full space-y-4 p-5">
      <PlayerIdentificationBlock
        player={{
          displayName: announcement.displayName,
          avatarUrl: announcement.avatarUrl,
          gender: announcement.gender,
          age: announcement.age,
        }}
      />

      <LocationNavBlock
        label={announcement.label}
        lat={announcement.lat}
        lng={announcement.lng}
      />

      {announcement.deck && !isOwn ? (
        <DisclosedDeckViewer
          deck={announcement.deck}
          spotId={announcement.spotId}
          label="使用牌組"
        />
      ) : null}
      {announcement.deck && isOwn ? (
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">使用牌組：</span>
          <span className="font-medium">{announcement.deck.title}</span>
        </p>
      ) : null}

      <p className="text-sm text-foreground">
        <span className="text-muted-foreground">賽制：</span>
        <span className="font-medium">
          {PLAY_FORMAT_LABELS[parsePlayFormat(announcement.playFormat)]}
        </span>
      </p>

      {announcement.playNote ? (
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {announcement.playNote}
        </p>
      ) : null}

      {announcement.bio ? (
        <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border pt-2">
          <span className="font-medium">個人簡介：</span>
          {announcement.bio}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        公告至 {formatExpiresAt(announcement.expiresAt)}
      </p>

      {!isOwn && onInvite ? (
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <DeckPickerField
            value={inviteDeckId}
            onChange={setInviteDeckId}
            disabled={pending}
            label="邀請時使用的牌組（選填）"
            id="invite-deck-picker"
          />
          <button
            type="button"
            data-testid="send-invite"
            disabled={pending}
            onClick={() => onInvite(inviteDeckId)}
            className="btn btn-primary w-full"
          >
            {pending ? "處理中…" : "邀請對戰"}
          </button>
        </div>
      ) : null}

      {isOwn && onClear ? (
        <div className="mt-auto border-t border-border pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="btn btn-outline w-full border-red-200 text-red-700 hover:bg-red-50"
          >
            結束公告
          </button>
        </div>
      ) : null}

      {!isOwn ? (
        <p className="text-center text-xs text-muted-foreground">
          <Link
            href={`/profile/${announcement.userId}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            查看個人檔案
          </Link>
        </p>
      ) : null}
    </div>
  );
}
