"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ResponsiveSheet({ isOpen, onClose, title, children }: Props) {
  const titleId = useId();
  const [expandedMobile, setExpandedMobile] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 640);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setExpandedMobile(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(e.clientY);
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sheetRef.current) return;

    const delta = e.clientY - dragStart;

    if (delta > 30) {
      if (expandedMobile) {
        setExpandedMobile(false);
      } else {
        onClose();
      }
      setIsDragging(false);
    } else if (delta < -30 && !expandedMobile) {
      setExpandedMobile(true);
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sheetRef.current) return;

    const delta = e.touches[0].clientY - dragStart;

    if (delta > 30) {
      if (expandedMobile) {
        setExpandedMobile(false);
      } else {
        onClose();
      }
      setIsDragging(false);
    } else if (delta < -30 && !expandedMobile) {
      setExpandedMobile(true);
      setIsDragging(false);
    }
  };

  if (!isOpen) return null;

  const desktopPanel = (
    <div className="hidden h-full max-h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:flex">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
        {title ? (
          <h2 id={!isMobile ? titleId : undefined} className="min-w-0 flex-1 text-lg font-semibold text-foreground line-clamp-2">
            {title}
          </h2>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <button type="button" onClick={onClose} className="btn btn-ghost shrink-0 p-2" aria-label="關閉">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );

  const mobileUi = (
    <>
      <div
        className={`fixed inset-0 z-[999] transition-opacity duration-300 sm:hidden ${
          expandedMobile ? "pointer-events-auto bg-black/40" : "pointer-events-none"
        }`}
        onClick={() => {
          if (expandedMobile) setExpandedMobile(false);
        }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[1000] sm:hidden">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`pointer-events-auto absolute bottom-0 left-0 right-0 flex flex-col rounded-t-[1.25rem] border border-border bg-card shadow-lg transition-all duration-300 ease-out ${
            expandedMobile
              ? "top-0 rounded-t-2xl"
              : isDragging
                ? ""
                : "h-[30vh]"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-12 rounded-full bg-muted" />
          </div>

          <div className="flex items-center justify-between border-b border-border px-5 pb-3">
            {title ? (
              <h2 id={isMobile ? titleId : undefined} className="line-clamp-1 text-base font-semibold text-foreground">
                {title}
              </h2>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost ml-auto shrink-0 p-2"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className={`overflow-y-auto px-5 ${
              expandedMobile ? "flex-1 pb-5" : "max-h-[calc(30vh-100px)]"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {desktopPanel}
      {mounted && isMobile ? createPortal(mobileUi, document.body) : null}
    </>
  );
}
