import { addSSEClient, removeSSEClient } from "@/lib/allocate";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Create a writable interface that the SSE system can use
      const client = {
        write(data) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (e) {
            // Stream closed
          }
        },
      };

      // Register this client
      addSSEClient(client);

      // Send initial heartbeat
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup when client disconnects
      const cleanup = () => {
        clearInterval(heartbeat);
        removeSSEClient(client);
      };

      // Note: Next.js doesn't provide a direct disconnect signal
      // The heartbeat failure will handle cleanup
      client._cleanup = cleanup;
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Prevent Next.js from caching this route
export const dynamic = "force-dynamic";
