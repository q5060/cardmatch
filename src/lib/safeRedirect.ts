/** Same-origin relative path only; blocks protocol-relative and odd schemes. */
export function safeLoginRedirect(raw: string | null): string {
  if (!raw) return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  if (t.includes("\\") || t.includes("\0")) return "/";
  return t;
}

/** Login URL preserving return path after sign-in. */
export function loginUrlWithNext(nextPath: string): string {
  return `/login?next=${encodeURIComponent(safeLoginRedirect(nextPath))}`;
}
