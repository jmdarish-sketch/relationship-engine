import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized, err } from "@/lib/api/response";
import { generateOutreachSuggestion } from "@/lib/ai/insights";

/**
 * POST /api/outreach
 * Body: { person_id }
 * Generates outreach strategy suggestions.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const { person_id } = await request.json();

  if (!person_id) {
    return badRequest("Missing person_id");
  }

  try {
    const result = await generateOutreachSuggestion(person_id, userId);

    let parsed = result.parsed;
    if (!parsed && result.insight.content) {
      try {
        parsed = JSON.parse(result.insight.content);
      } catch {
        // Return raw
      }
    }

    return ok(parsed ?? { strategies: [] });
  } catch (error) {
    if ((error as Error).message === "Person not found") {
      return notFound("Person not found");
    }
    console.error("[outreach] Failed:", error);
    return err("Failed to generate outreach", 500);
  }
}
