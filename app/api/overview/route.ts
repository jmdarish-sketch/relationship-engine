import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized, err } from "@/lib/api/response";
import { generateRelationshipSummary } from "@/lib/ai/insights";

/**
 * POST /api/overview
 * Body: { person_id }
 * Generates a natural-language overview paragraph about a person.
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
    const result = await generateRelationshipSummary(person_id, userId);
    return ok({ overview: result.content });
  } catch (error) {
    if ((error as Error).message === "Person not found") {
      return notFound("Person not found");
    }
    console.error("[overview] Failed:", error);
    return err("Failed to generate overview", 500);
  }
}
