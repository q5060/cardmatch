import { getSession } from "@/lib/auth";
import { getBus } from "@/lib/realtime/getBus";
import type { RealtimeEvent } from "@/lib/realtime/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PING_MS = 25_000;

function encodeSse(event: RealtimeEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.userId;
  const bus = getBus();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const enqueue = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeSse(event)));
        } catch {
          // stream closed
        }
      };

      const sub = bus.subscribe(userId, enqueue);
      enqueue({ type: "connected" });

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(ping);
        }
      }, PING_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        sub.unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
