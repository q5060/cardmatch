"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { motionClass, prefersReducedMotion } from "@/lib/motion";

function subscribeReducedMotion(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return prefersReducedMotion();
}

function getReducedMotionServerSnapshot() {
  return false;
}

type Props = {
  children: React.ReactNode;
};

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  return (
    <div
      key={pathname}
      className={motionClass(!reducedMotion, "motion-fade-in-up")}
    >
      {children}
    </div>
  );
}
