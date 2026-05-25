export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Returns className when motion is allowed, empty string when reduced motion is preferred. */
export function motionClass(enabled: boolean, className: string): string {
  return enabled ? className : "";
}

/** Stagger class for list items (index 0–4 maps to motion-stagger-1 … 5). */
export function staggerClass(index: number): string {
  const slot = Math.min(index, 4) + 1;
  return `motion-stagger-${slot}`;
}
