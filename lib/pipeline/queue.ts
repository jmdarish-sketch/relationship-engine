import { processInteraction } from "./processor";

/**
 * Fire-and-forget processing using Vercel's waitUntil.
 * Call this after creating a pending interaction to process it
 * without blocking the HTTP response.
 *
 * On Vercel, pass the waitUntil function from the request context.
 * In development, it just runs as a promise (may outlive the response).
 */
export function enqueueProcessing(
  interactionId: string,
  waitUntil?: (promise: Promise<unknown>) => void
) {
  const work = processInteraction(interactionId).catch((err) => {
    console.error(
      `[queue] Background processing failed for ${interactionId}:`,
      err
    );
  });

  if (waitUntil) {
    waitUntil(work);
  }
  // In dev without waitUntil, the promise runs detached.
  // This is fine — the interaction stays "pending" and can be retried.
}

/**
 * Process all pending interactions. Used as a manual trigger
 * or cron fallback if waitUntil misses something.
 */
export async function processAllPending() {
  // Import prisma lazily to avoid circular deps
  const { prisma } = await import("@/lib/prisma");

  const pending = await prisma.interaction.findMany({
    where: { processingStatus: "pending" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const results = [];
  for (const { id } of pending) {
    try {
      await processInteraction(id);
      results.push({ id, status: "completed" });
    } catch (err) {
      results.push({
        id,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
