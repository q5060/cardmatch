"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function ResponsiveSheet({ isOpen, onClose, title, children }: Props) {
  const [expandedMobile, setExpandedMobile] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setExpandedMobile(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Prevent body scroll when sheet is open (only on mobile where it overlays the screen)
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

    // If dragging down, close or minimize
    if (delta > 30) {
      if (expandedMobile) {
        setExpandedMobile(false);
      } else {
        onClose();
      }
      setIsDragging(false);
    }
    // If dragging up, expand
    else if (delta < -30 && !expandedMobile) {
      setExpandedMobile(true);
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sheetRef.current) return;

    const delta = e.touches[0].clientY - dragStart;

    // If dragging down, close or minimize
    if (delta > 30) {
      if (expandedMobile) {
        setExpandedMobile(false);
      } else {
        onClose();
      }
      setIsDragging(false);
    }
    // If dragging up, expand
    else if (delta < -30 && !expandedMobile) {
      setExpandedMobile(true);
      setIsDragging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - only on mobile when expanded, not on desktop */}
      {isMobile && (
        <div
          className={`fixed inset-0 z-[999] transition-opacity duration-300 ${
            expandedMobile ? "bg-black/40 pointer-events-auto" : "pointer-events-none"
          }`}
          onClick={() => {
            if (expandedMobile) setExpandedMobile(false);
          }}
        />
      )}

      {/* Desktop: Absolute sidebar from right */}
      <div className="hidden sm:block absolute right-0 top-0 bottom-0 z-[10] w-96 pointer-events-auto">
        <div className="h-full bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] border-l border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            {title && <h2 className="text-lg font-semibold text-foreground line-clamp-1">{title}</h2>}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition ml-2 shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>

      {/* Mobile: Bottom sheet with two stages */}
      <div className="sm:hidden fixed inset-0 z-[1000] pointer-events-none">
        <div
          ref={sheetRef}
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg pointer-events-auto transition-all duration-300 ease-out ${
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
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-12 bg-muted rounded-full" />
          </div>

          {/* Peek Header - always visible */}
          <div className="px-5 pb-3 border-b border-border flex items-center justify-between">
            {title && (
              <h2 className="text-base font-semibold text-foreground line-clamp-1">
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition ml-2 shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - scrollable when expanded */}
          <div
            className={`overflow-y-auto px-5 ${
              expandedMobile ? "flex-1 pb-5" : "max-h-[calc(30vh-100px)]"
            }`}
          >
            {children}
          </div>

          {/* Expand Hint - only shown when not expanded */}
          {!expandedMobile && (
            <div className="px-5 py-3 text-center text-xs text-muted-foreground border-t border-border">
              向上拉開查看詳情
            </div>
          )}
        </div>
      </div>
    </>
  );
}
