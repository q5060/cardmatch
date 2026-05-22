export function formatExpiresAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-Hant", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
