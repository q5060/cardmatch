"use client";

import Link from "next/link";
import { motionClass } from "@/lib/motion";

export type ChatMessageSender = {
  id: number;
  displayName: string;
};

export type ChatMessageRowData = {
  id: string;
  senderId: number;
  body: string;
  sender: ChatMessageSender;
};

type Props = {
  message: ChatMessageRowData;
  mine: boolean;
  animateEnter?: boolean;
  reducedMotion?: boolean;
};

export function ChatMessageRow({
  message,
  mine,
  animateEnter = false,
  reducedMotion = false,
}: Props) {
  return (
    <div className="flex w-full min-w-0 justify-start">
      <div
        className={`max-w-[85%] shrink-0 rounded-xl px-3 py-2 shadow-sm ${
          mine
            ? "ml-auto bg-primary text-white"
            : "bg-[var(--bubble-other)] text-foreground ring-1 ring-black/[0.04]"
        } ${motionClass(animateEnter && !reducedMotion, "motion-bubble-in")}`}
      >
        {!mine ? (
          <div className="mb-1 text-xs opacity-70">
            <Link
              href={`/profile/${message.sender.id}`}
              className="underline-offset-2 hover:underline"
            >
              {message.sender.displayName}
            </Link>
          </div>
        ) : null}
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
      </div>
    </div>
  );
}
