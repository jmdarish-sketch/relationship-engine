import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized, err } from "@/lib/api/response";
import { generatePrepBrief } from "@/lib/ai/insights";

/**
 * POST /api/prep
 * Body: { person_id, context?, goals? }
 * Generates a prep brief for an upcoming meeting.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const { person_id, context, goals } = await request.json();

  if (!person_id) {
    return badRequest("Missing person_id");
  }

  try {
    const result = await generatePrepBrief(person_id, userId);

    // Parse the structured brief if stored as JSON string
    let parsed = result.parsed;
    if (!parsed && result.insight.content) {
      try {
        parsed = JSON.parse(result.insight.content);
      } catch {
        // Return raw content
      }
    }

    return ok({ prep: parsed ?? result.insight.content });
  } catch (error) {
    if ((error as Error).message === "Person not found") {
      return notFound("Person not found");
    }
    console.error("[prep] Failed:", error);
    return err("Failed to generate prep", 500);
  }
}
