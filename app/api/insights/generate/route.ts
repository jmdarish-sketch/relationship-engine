import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, notFound, unauthorized, err } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;
import {
  generatePrepBrief,
  generateOutreachSuggestion,
  generateRelationshipSummary,
} from "@/lib/ai/insights";

const schema = z.object({
  person_id: z.string().uuid(),
  type: z.enum([
    "prep_brief",
    "outreach_suggestion",
    "relationship_summary",
    "follow_up",
  ]),
});

/**
 * POST /api/insights/generate
 * Generate an AI insight for a person.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const { person_id, type } = parsed.data;

  // Verify person belongs to user
  const person = await prisma.person.findFirst({
    where: { id: person_id, userId },
  });
  if (!person) return notFound("Person not found");

  try {
    switch (type) {
      case "prep_brief": {
        const result = await generatePrepBrief(person_id, userId);
        return ok(result.insight);
      }
      case "outreach_suggestion": {
        const result = await generateOutreachSuggestion(person_id, userId);
        return ok(result.insight);
      }
      case "relationship_summary": {
        const result = await generateRelationshipSummary(person_id, userId);
        return ok(result.insight);
      }
      case "follow_up": {
        // Follow-up generation reuses prep brief logic
        const result = await generatePrepBrief(person_id, userId);
        return ok(result.insight);
      }
    }
  } catch (error) {
    console.error("[insights/generate] AI call failed:", error);
    return err(
      "Failed to generate insight",
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}
