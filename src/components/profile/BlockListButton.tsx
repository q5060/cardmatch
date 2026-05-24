"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { UserRound, X } from "lucide-react";
import { unblockUser } from "@/actions/block";
import type { BlockListItem } from "@/actions/block";

type Props = {
  initialBlocks: BlockListItem[];
};

export function BlockListButton({ initialBlocks }: Props) {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isPending, startTransition] = useTransition();

  const handleUnblock = (blockedId: number) => {
    if (!confirm("確定要解除封鎖此用戶？")) return;
    startTransition(async () => {
      try {
        await unblockUser(blockedId);
        setBlocks((prev) => prev.filter((b) => b.blockedId !== blockedId));
      } catch (e) {
        alert(e instanceof Error ? e.message : "操作失敗");
      }
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-outline btn-sm shrink-0">
        封鎖清單{blocks.length > 0 && ` (${blocks.length})`}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">封鎖清單</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {blocks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  目前沒有封鎖任何用戶
                </p>
              ) : (
                <ul className="space-y-3">
                  {blocks.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                        {b.avatarUrl ? (
                          <Image
                            src={b.avatarUrl}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <UserRound className="h-5 w-5 opacity-70" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{b.displayName}</p>
                        {b.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground">備註：{b.note}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          封鎖於 {new Date(b.createdAt).toLocaleDateString("zh-Hant")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnblock(b.blockedId)}
                        disabled={isPending}
                        className="btn btn-outline btn-sm shrink-0 text-xs"
                      >
                        解除封鎖
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
