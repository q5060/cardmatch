"use client";

import type { ReactNode } from "react";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

export function RealtimeShell({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
