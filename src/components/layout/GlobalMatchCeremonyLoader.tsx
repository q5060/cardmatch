import { fetchActiveMatchSummaryForShell } from "@/lib/matchDto";
import { GlobalMatchCeremony } from "./GlobalMatchCeremony";

export async function GlobalMatchCeremonyLoader({ userId }: { userId: number }) {
  const initialActiveMatch = await fetchActiveMatchSummaryForShell(userId);
  return (
    <GlobalMatchCeremony userId={userId} initialActiveMatch={initialActiveMatch} />
  );
}
