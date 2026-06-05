"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Link2 } from "lucide-react";
import {
  buildFacebookShareUrl,
  buildShareClipboardText,
  buildSharePostText,
  buildShareUrl,
  buildThreadsShareUrl,
  buildTwitterShareUrl,
  type MatchSharePayload,
} from "@/lib/matchShare";
import { MatchResultShareCard } from "@/components/battle/MatchResultShareCard";
import { MatchResultNotesPanel } from "@/components/battle/MatchResultNotesPanel";
import { IconFacebook, IconThreads, IconX } from "@/components/battle/SharePlatformIcons";

type Props = {
  share: MatchSharePayload;
  viewerId: number;
  onDone: () => void;
};

function ShareIconButton({
  label,
  onClick,
  success,
  children,
}: {
  label: string;
  onClick: () => void;
  success?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`btn btn-outline flex h-11 w-11 items-center justify-center rounded-full p-0 transition-colors ${
        success ? "border-primary bg-primary/10 text-primary" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function BattleResultShareScreen({ share, viewerId, onDone }: Props) {
  const [shareState, setShareState] = useState(share);
  const [linkCopied, setLinkCopied] = useState(false);
  const [fbCopied, setFbCopied] = useState(false);

  useEffect(() => {
    setShareState(share);
  }, [share]);

  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    return buildShareUrl(shareState.matchId, origin);
  }, [shareState.matchId]);

  const ogImageUrl = `${shareUrl}/opengraph-image`;
  const postText = buildSharePostText(shareState);
  const clipboardText = useMemo(
    () => buildShareClipboardText(shareState, shareUrl),
    [shareState, shareUrl],
  );

  const flashCopied = useCallback((setter: (v: boolean) => void) => {
    setter(true);
    window.setTimeout(() => setter(false), 2000);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashCopied(setLinkCopied);
    } catch {
      window.prompt("複製此連結：", shareUrl);
    }
  }, [flashCopied, shareUrl]);

  const shareFacebook = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(clipboardText);
      flashCopied(setFbCopied);
    } catch {
      /* still open share dialog */
    }
    window.open(
      buildFacebookShareUrl(shareUrl, postText),
      "_blank",
      "noopener,noreferrer,width=600,height=520",
    );
  }, [clipboardText, flashCopied, postText, shareUrl]);

  const openShare = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=520");
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">對戰完成</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          分享這場對戰的結果連結，好友可在 X、Facebook、Threads 等平台看到預覽圖。
        </p>
      </div>

      <MatchResultShareCard share={shareState} viewerId={viewerId} />

      <MatchResultNotesPanel
        share={shareState}
        viewerId={viewerId}
        onShareUpdate={setShareState}
      />

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">分享連結</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 rounded-xl border border-border bg-neutral-50 px-3 py-2 text-sm text-foreground"
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <ShareIconButton
          label="分享至 X"
          onClick={() => openShare(buildTwitterShareUrl(shareUrl, postText))}
        >
          <IconX />
        </ShareIconButton>
        <ShareIconButton
          label={fbCopied ? "已複製內文，請貼到 Facebook" : "分享至 Facebook"}
          onClick={() => void shareFacebook()}
          success={fbCopied}
        >
          {fbCopied ? (
            <Check className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          ) : (
            <IconFacebook />
          )}
        </ShareIconButton>
        <ShareIconButton
          label="分享至 Threads"
          onClick={() => openShare(buildThreadsShareUrl(shareUrl, postText))}
        >
          <IconThreads />
        </ShareIconButton>
        <ShareIconButton
          label={linkCopied ? "已複製連結" : "複製連結"}
          onClick={() => void copyLink()}
          success={linkCopied}
        >
          {linkCopied ? (
            <Check className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          ) : (
            <Link2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          )}
        </ShareIconButton>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        點 Facebook 會先複製內文與連結，開啟後貼上即可。
      </p>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <button type="button" onClick={onDone} className="btn btn-primary min-w-[8rem]">
          返回地圖
        </button>
        <a
          href={ogImageUrl}
          download={`cardmatch-match-${shareState.matchId}.png`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          下載圖片
        </a>
      </div>
    </div>
  );
}
