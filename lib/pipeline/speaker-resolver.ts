import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { callHaiku, parseStructuredResponse } from "@/lib/ai/anthropic";
import { speakerResolutionPrompt } from "@/lib/ai/prompts";
import { buildDisplayName } from "@/lib/api/fingerprint";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedSpeaker {
  label: string;
  probable_name: string | null;
  identity_signals: {
    names?: string[];
    employers?: string[];
    roles?: string[];
    schools?: string[];
    interests?: string[];
    locations?: string[];
    other?: string[];
  };
}

export interface ResolvedSpeaker {
  label: string;
  personId: string;
  resolution: "matched" | "created" | "disambiguation";
  confidence: number;
}

interface AIMatchResult {
  matches: { candidate_id: string; confidence: number; reasoning: string }[];
  best_match_id: string | null;
  best_confidence: number;
}

// ---------------------------------------------------------------------------
// Fingerprint types — arrays of values, not single values
// ---------------------------------------------------------------------------

interface Fingerprint {
  names?: string[];
  employers?: string[];
  roles?: string[];
  schools?: string[];
  interests?: string[];
  locations?: string[];
  [key: string]: string[] | undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve each extracted speaker to a Person record.
 * Three-tier confidence:
 *   > 0.8  → auto-link
 *   < 0.3  → create new person
 *   0.3-0.8 → disambiguation queue
 */
export async function resolveSpeakers(
  userId: string,
  interactionId: string,
  speakers: ExtractedSpeaker[]
): Promise<ResolvedSpeaker[]> {
  const results: ResolvedSpeaker[] = [];

  for (const speaker of speakers) {
    const result = await resolveSingle(userId, interactionId, speaker);
    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function resolveSingle(
  userId: string,
  interactionId: string,
  speaker: ExtractedSpeaker
): Promise<ResolvedSpeaker> {
  const signals = speaker.identity_signals;

  // Find candidate people to match against
  const candidates = await findCandidates(userId, speaker);

  if (candidates.length === 0) {
    // No existing contacts — create a new person
    const person = await createPerson(userId, interactionId, speaker);
    return {
      label: speaker.label,
      personId: person.id,
      resolution: "created",
      confidence: 1.0,
    };
  }

  // Use AI to score candidates
  let bestId: string | null = null;
  let bestConfidence = 0;

  try {
    const { system, user } = speakerResolutionPrompt(
      signals as Record<string, string[]>,
      candidates.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        fingerprint: c.fingerprint,
      }))
    );

    const raw = await callHaiku(system, user);
    const parsed = parseStructuredResponse<AIMatchResult>(raw);

    if (parsed) {
      bestId = parsed.best_match_id;
      bestConfidence = parsed.best_confidence;
    }
  } catch (err) {
    console.error("[speaker-resolver] AI matching failed, using fallback:", err);
    // Fallback: simple name matching
    const result = fallbackNameMatch(speaker, candidates);
    bestId = result.id;
    bestConfidence = result.confidence;
  }

  // Three-tier decision
  if (bestId && bestConfidence > 0.8) {
    // High confidence — auto-link
    const person = candidates.find((c) => c.id === bestId)!;
    await linkAndUpdate(interactionId, person.id, speaker, bestConfidence);
    return {
      label: speaker.label,
      personId: person.id,
      resolution: "matched",
      confidence: bestConfidence,
    };
  }

  if (!bestId || bestConfidence < 0.3) {
    // Low confidence — create new person
    const person = await createPerson(userId, interactionId, speaker);
    return {
      label: speaker.label,
      personId: person.id,
      resolution: "created",
      confidence: 1.0,
    };
  }

  // Ambiguous — queue for disambiguation, tentatively link to best
  await linkAndUpdate(interactionId, bestId, speaker, bestConfidence);

  const candidateIds = candidates.map((c) => c.id);

  await prisma.disambiguationQueue.create({
    data: {
      userId,
      interactionId,
      speakerLabel: speaker.label,
      candidatePersonIds: candidateIds,
      identitySignalsSnapshot: signals as Prisma.InputJsonValue,
      status: "pending",
    },
  });

  return {
    label: speaker.label,
    personId: bestId,
    resolution: "disambiguation",
    confidence: bestConfidence,
  };
}

/**
 * Find candidate people by searching names, employers, and schools.
 */
async function findCandidates(userId: string, speaker: ExtractedSpeaker) {
  const signals = speaker.identity_signals;
  const nameTerms = [
    ...(signals.names ?? []),
    speaker.probable_name,
  ].filter(Boolean) as string[];

  if (nameTerms.length === 0 && !signals.employers?.length) {
    return [];
  }

  // Build OR conditions for name matching
  const orConditions: Prisma.PersonWhereInput[] = [];

  for (const name of nameTerms) {
    const parts = name.toLowerCase().trim().split(/\s+/);
    const first = parts[0];
    orConditions.push(
      { firstName: { contains: first, mode: "insensitive" } },
      { displayName: { contains: first, mode: "insensitive" } }
    );
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      orConditions.push({
        lastName: { contains: last, mode: "insensitive" },
      });
    }
  }

  if (orConditions.length === 0) return [];

  return prisma.person.findMany({
    where: {
      userId,
      OR: orConditions,
    },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      employer: true,
      school: true,
      fingerprint: true,
    },
    take: 10,
  });
}

/**
 * Fallback name matching when AI call fails.
 * Simple: exact first name match + employer overlap.
 */
function fallbackNameMatch(
  speaker: ExtractedSpeaker,
  candidates: { id: string; firstName: string | null; employer: string | null }[]
): { id: string | null; confidence: number } {
  const names = (speaker.identity_signals.names ?? []).map((n) =>
    n.toLowerCase()
  );
  const employers = (speaker.identity_signals.employers ?? []).map((e) =>
    e.toLowerCase()
  );

  let bestId: string | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    let score = 0;
    if (c.firstName && names.includes(c.firstName.toLowerCase())) {
      score += 0.5;
    }
    if (c.employer && employers.some((e) => c.employer!.toLowerCase().includes(e))) {
      score += 0.4;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = c.id;
    }
  }

  return { id: bestId, confidence: bestScore };
}

/**
 * Create a new Person from extracted speaker signals.
 */
async function createPerson(
  userId: string,
  interactionId: string,
  speaker: ExtractedSpeaker
) {
  const signals = speaker.identity_signals;
  const firstName = signals.names?.[0]?.split(/\s+/)[0] ?? null;
  const lastName =
    signals.names?.[0]?.split(/\s+/).slice(1).join(" ") || null;
  const employer = signals.employers?.[0] ?? null;
  const school = signals.schools?.[0] ?? null;
  const role = signals.roles?.[0] ?? null;

  const displayName = buildDisplayName({ firstName, lastName, employer, school });

  const fingerprint: Fingerprint = {};
  if (signals.names?.length) fingerprint.names = signals.names;
  if (signals.employers?.length) fingerprint.employers = signals.employers;
  if (signals.roles?.length) fingerprint.roles = signals.roles;
  if (signals.schools?.length) fingerprint.schools = signals.schools;
  if (signals.interests?.length) fingerprint.interests = signals.interests;
  if (signals.locations?.length) fingerprint.locations = signals.locations;

  const person = await prisma.person.create({
    data: {
      userId,
      displayName,
      firstName,
      lastName,
      employer,
      userCurrentRole: role,
      school,
      fingerprint: Object.keys(fingerprint).length > 0
        ? (fingerprint as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
  });

  // Link to interaction
  await prisma.interactionPerson.create({
    data: {
      interactionId,
      personId: person.id,
      confidenceScore: 1.0,
      speakerLabel: speaker.label,
    },
  });

  // Store identity signals
  await storeSignals(person.id, interactionId, speaker);

  return person;
}

/**
 * Link speaker to existing person and update their fingerprint with new signals.
 */
async function linkAndUpdate(
  interactionId: string,
  personId: string,
  speaker: ExtractedSpeaker,
  confidence: number
) {
  // Create the interaction link
  await prisma.interactionPerson.create({
    data: {
      interactionId,
      personId,
      confidenceScore: confidence,
      speakerLabel: speaker.label,
    },
  });

  // Store new identity signals
  await storeSignals(personId, interactionId, speaker);

  // Merge new signals into the person's fingerprint
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { fingerprint: true, firstName: true, lastName: true, employer: true, school: true },
  });
  if (!person) return;

  const existing = (person.fingerprint as Fingerprint) ?? {};
  const signals = speaker.identity_signals;

  // Merge arrays, deduplicate
  const merged: Fingerprint = { ...existing };
  for (const key of ["names", "employers", "roles", "schools", "interests", "locations"] as const) {
    const newVals = signals[key] ?? [];
    const existingVals = existing[key] ?? [];
    if (newVals.length > 0) {
      merged[key] = [...new Set([...existingVals, ...newVals])];
    }
  }

  // Update person fields if we learned new info
  const updates: Record<string, unknown> = {
    fingerprint: merged as Prisma.InputJsonValue,
  };

  if (!person.firstName && signals.names?.[0]) {
    updates.firstName = signals.names[0].split(/\s+/)[0];
  }
  if (!person.lastName && signals.names?.[0]?.includes(" ")) {
    updates.lastName = signals.names[0].split(/\s+/).slice(1).join(" ");
  }
  if (!person.employer && signals.employers?.[0]) {
    updates.employer = signals.employers[0];
  }
  if (!person.school && signals.schools?.[0]) {
    updates.school = signals.schools[0];
  }

  // Auto-update display name if we learned a new affiliation
  if (updates.employer || updates.firstName) {
    const newFirst = (updates.firstName as string) ?? person.firstName;
    const newLast = (updates.lastName as string) ?? person.lastName;
    const newEmployer = (updates.employer as string) ?? person.employer;
    const newSchool = (updates.school as string) ?? person.school;
    updates.displayName = buildDisplayName({
      firstName: newFirst,
      lastName: newLast,
      employer: newEmployer,
      school: newSchool,
    });
  }

  await prisma.person.update({
    where: { id: personId },
    data: updates,
  });
}

/**
 * Store individual identity signals for a speaker/person.
 */
async function storeSignals(
  personId: string,
  interactionId: string,
  speaker: ExtractedSpeaker
) {
  const signals = speaker.identity_signals;
  const rows: {
    personId: string;
    interactionId: string;
    signalType: string;
    signalValue: string;
    confidence: number;
  }[] = [];

  const addSignals = (type: string, values: string[] | undefined, conf: number) => {
    for (const val of values ?? []) {
      rows.push({
        personId,
        interactionId,
        signalType: type,
        signalValue: val,
        confidence: conf,
      });
    }
  };

  addSignals("name_mention", signals.names, 0.9);
  addSignals("employer_mention", signals.employers, 0.85);
  addSignals("role_mention", signals.roles, 0.8);
  addSignals("school_mention", signals.schools, 0.8);
  addSignals("interest_mention", signals.interests, 0.6);
  addSignals("location_mention", signals.locations, 0.5);

  if (rows.length > 0) {
    await prisma.identitySignal.createMany({ data: rows });
  }
}
