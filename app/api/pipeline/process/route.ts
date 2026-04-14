import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/api/auth";
import { ok, unauthorized } from "@/lib/api/response";
import { processAllPending } from "@/lib/pipeline/queue";

/**
 * POST /api/pipeline/process
 * Manual trigger to process all pending interactions.
 * Useful as a cron fallback or debugging tool.
 */
export async function POST(request: NextRequest) {
  try {
    await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const results = await processAllPending();
  return ok(results);
}
