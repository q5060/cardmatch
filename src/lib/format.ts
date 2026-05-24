export function formatExpiresAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-Hant", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventRange(startsAt: Date | string, endsAt?: Date | string | null): string {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const startLabel = start.toLocaleString("zh-Hant", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endsAt) return startLabel;

  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const sameDay =
    start.toLocaleDateString("zh-Hant", { timeZone: "Asia/Taipei" }) ===
    end.toLocaleDateString("zh-Hant", { timeZone: "Asia/Taipei" });

  if (sameDay) {
    const endTime = end.toLocaleString("zh-Hant", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startLabel}–${endTime}`;
  }

  const endLabel = end.toLocaleString("zh-Hant", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startLabel} – ${endLabel}`;
}
