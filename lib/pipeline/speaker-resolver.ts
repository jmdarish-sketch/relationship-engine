import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakerExtracted, IdentitySignalExtracted } from "@/lib/types";

const NAME_SIGNAL_TYPES = new Set([
  "first_name",
  "last_name",
  "full_name",
  "formal_name",
  "nickname",
]);

/** Priority order for the contextualizing clue in display labels. */
const CONTEXT_SIGNAL_PRIORITY = [
  "employer",
  "startup",
  "company",
  "school",
  "role",
  "major",
  "hobby",
  "personal_interest",
];

interface ResolvedSpeaker {
  speaker_id: string;
  person_id: string;
  resolution: "matched" | "created" | "ambiguous";
  confidence: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * For each extracted speaker, resolve them to a Person record:
 * - confidence > 0.8  → auto-link to existing person
 * - confidence < 0.3  → create new person
 * - 0.3–0.8           → add to disambiguation queue
 */
export async function resolveSpeakers(
  supabase: SupabaseClient,
  userId: string,
  interactionId: string,
  speakers: SpeakerExtracted[]
): Promise<ResolvedSpeaker[]> {
  const resolved: ResolvedSpeaker[] = [];

  for (const speaker of speakers) {
    const result = await resolveSingleSpeaker(
      supabase,
      userId,
      interactionId,
      speaker
    );
    resolved.push(result);
  }

  return resolved;
}

/**
 * Signal types where exact string matches are expected (e.g. company names).
 * Mismatches here are true contradictions.
 */
const STABLE_SIGNAL_TYPES = new Set([
  "employer", "school", "hometown", "grad_year", "age",
]);

/**
 * Signal types where LLM descriptions vary across conversations.
 * Mismatches are inconclusive, not contradictions.
 */
const VOLATILE_SIGNAL_TYPES = new Set([
  "role", "major", "meeting_context", "mutual_connection", "physical_description",
]);

/**
 * Check if two strings share significant words.
 */
function wordOverlap(a: string, b: string): number {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "of", "for", "in", "at", "to", "is", "was",
    "are", "on", "it", "by", "from", "with", "as", "that", "this",
  ]);

  const wordsA = a.toLowerCase().split(/\W+/).filter((w) => w.length > 1 && !stopWords.has(w));
  const wordsB = b.toLowerCase().split(/\W+/).filter((w) => w.length > 1 && !stopWords.has(w));

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setB = new Set(wordsB);
  let shared = 0;
  for (const w of wordsA) {
    if (setB.has(w)) shared++;
  }

  return shared / Math.min(wordsA.length, wordsB.length);
}

/**
 * Score a candidate person against new identity signals.
 *
 * Strategy:
 * - Stable signals (employer, school) are weighted heavily: matches boost,
 *   mismatches penalize.
 * - Volatile signals (role, meeting_context) are free-text from the LLM and
 *   vary between conversations. Any word overlap counts as a match; a total
 *   mismatch is ignored (not a contradiction) since the LLM simply described
 *   the role differently.
 */
export function scoreCandidate(
  existingFingerprint: Record<string, unknown> | null,
  newSignals: IdentitySignalExtracted[]
): number {
  if (!existingFingerprint || Object.keys(existingFingerprint).length === 0) {
    return 0.2;
  }

  let matchWeight = 0;
  let contradictionWeight = 0;
  let totalWeight = 0;

  for (const signal of newSignals) {
    if (NAME_SIGNAL_TYPES.has(signal.signal_type)) continue;

    const existingValue = existingFingerprint[signal.signal_type];
    if (!existingValue) continue;

    const existingStr = String(existingValue).toLowerCase();
    const newStr = signal.signal_value.toLowerCase();
    const isStable = STABLE_SIGNAL_TYPES.has(signal.signal_type);

    // Weight stable signals higher (employer match is a strong signal)
    const weight = isStable ? 2.0 : 1.0;
    totalWeight += weight;

    // Check exact/substring match
    if (
      existingStr === newStr ||
      existingStr.includes(newStr) ||
      newStr.includes(existingStr)
    ) {
      matchWeight += weight * signal.confidence;
      continue;
    }

    // Check word overlap
    const overlap = wordOverlap(existingStr, newStr);
    if (overlap > 0) {
      matchWeight += weight * signal.confidence * overlap;
      continue;
    }

    // No match at all
    if (isStable) {
      // Stable signal mismatch is a real contradiction
      contradictionWeight += weight * signal.confidence;
    }
    // Volatile signal mismatch: ignore (LLM described it differently)
  }

  if (totalWeight === 0) return 0.15; // No comparable signals — very low confidence

  const matchScore = matchWeight / totalWeight;
  const contradictionPenalty = contradictionWeight / totalWeight;

  return Math.max(0, Math.min(1, matchScore - contradictionPenalty * 0.5));
}

/**
 * Build a display_label from identity signals.
 * Format: "Name — Context" e.g. "Zach — Evercore TMT"
 */
export function buildDisplayLabel(
  firstName: string | null,
  lastName: string | null,
  signals: { signal_type: string; signal_value: string; confidence: number }[]
): string {
  // Build the best name portion
  let namePart: string;
  const fullNameSignal = signals
    .filter((s) => s.signal_type === "full_name")
    .sort((a, b) => b.confidence - a.confidence)[0];
  const formalSignal = signals
    .filter((s) => s.signal_type === "formal_name")
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (firstName && lastName) {
    namePart = `${firstName} ${lastName}`;
  } else if (fullNameSignal) {
    namePart = fullNameSignal.signal_value;
  } else if (formalSignal) {
    namePart = formalSignal.signal_value;
  } else if (firstName) {
    namePart = firstName;
  } else if (lastName) {
    namePart = lastName;
  } else {
    namePart = "Unknown";
  }

  // Find the best contextualizing clue
  let contextClue: string | null = null;
  for (const type of CONTEXT_SIGNAL_PRIORITY) {
    const match = signals
      .filter((s) => s.signal_type === type && s.confidence >= 0.4)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (match) {
      contextClue = match.signal_value;
      break;
    }
  }

  if (contextClue) {
    return `${namePart} — ${contextClue}`;
  }

  return namePart;
}

/**
 * Regenerate a person's display_label from their current identity signals.
 * Uses the most recent interaction's signals to determine what's current.
 */
export async function regenerateDisplayLabel(
  supabase: SupabaseClient,
  personId: string
): Promise<string> {
  // Fetch the person's current name fields
  const { data: person } = await supabase
    .from("people")
    .select("first_name, last_name")
    .eq("id", personId)
    .single();

  // Fetch all signals, ordered by most recent first
  const { data: signals } = await supabase
    .from("identity_signals")
    .select("signal_type, signal_value, confidence, observed_at")
    .eq("person_id", personId)
    .order("observed_at", { ascending: false });

  if (!signals || signals.length === 0) {
    return person?.first_name ?? person?.last_name ?? "Unknown";
  }

  // For context signals, prefer the most recent ones (they reflect current state).
  // For each context signal type, keep only the most recent entry.
  const latestContextSignals: { signal_type: string; signal_value: string; confidence: number }[] = [];
  const seenContextTypes = new Set<string>();
  for (const s of signals) {
    if (!NAME_SIGNAL_TYPES.has(s.signal_type) && !seenContextTypes.has(s.signal_type)) {
      seenContextTypes.add(s.signal_type);
      latestContextSignals.push(s);
    }
  }

  // For name signals, keep highest confidence per type
  const nameSignals: { signal_type: string; signal_value: string; confidence: number }[] = [];
  const seenNameTypes = new Set<string>();
  const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);
  for (const s of sorted) {
    if (NAME_SIGNAL_TYPES.has(s.signal_type) && !seenNameTypes.has(s.signal_type)) {
      seenNameTypes.add(s.signal_type);
      nameSignals.push(s);
    }
  }

  const allSignals = [...nameSignals, ...latestContextSignals];

  const label = buildDisplayLabel(
    person?.first_name ?? null,
    person?.last_name ?? null,
    allSignals
  );

  // Update the person record
  await supabase
    .from("people")
    .update({ display_label: label })
    .eq("id", personId);

  return label;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function resolveSingleSpeaker(
  supabase: SupabaseClient,
  userId: string,
  interactionId: string,
  speaker: SpeakerExtracted
): Promise<ResolvedSpeaker> {
  const detectedName = speaker.detected_name;

  if (!detectedName) {
    const person = await createNewPerson(supabase, userId, speaker);
    await linkSpeaker(supabase, interactionId, person.id, speaker, 1.0);
    await storeIdentitySignals(supabase, person.id, interactionId, speaker.identity_signals);
    return {
      speaker_id: speaker.speaker_id,
      person_id: person.id,
      resolution: "created",
      confidence: 1.0,
    };
  }

  const candidates = await findCandidates(supabase, userId, detectedName);

  if (candidates.length === 0) {
    const person = await createNewPerson(supabase, userId, speaker);
    await linkSpeaker(supabase, interactionId, person.id, speaker, 1.0);
    await storeIdentitySignals(supabase, person.id, interactionId, speaker.identity_signals);
    return {
      speaker_id: speaker.speaker_id,
      person_id: person.id,
      resolution: "created",
      confidence: 1.0,
    };
  }

  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: scoreCandidate(candidate.identity_fingerprint, speaker.identity_signals),
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (best.score > 0.8) {
    await linkSpeaker(supabase, interactionId, best.id, speaker, best.score);
    await storeIdentitySignals(supabase, best.id, interactionId, speaker.identity_signals);
    await updatePersonProfile(supabase, best.id, speaker, interactionId);
    return {
      speaker_id: speaker.speaker_id,
      person_id: best.id,
      resolution: "matched",
      confidence: best.score,
    };
  }

  if (best.score < 0.3) {
    const person = await createNewPerson(supabase, userId, speaker);
    await linkSpeaker(supabase, interactionId, person.id, speaker, 1.0);
    await storeIdentitySignals(supabase, person.id, interactionId, speaker.identity_signals);
    return {
      speaker_id: speaker.speaker_id,
      person_id: person.id,
      resolution: "created",
      confidence: 1.0,
    };
  }

  // Ambiguous
  await linkSpeaker(supabase, interactionId, best.id, speaker, best.score);
  await storeIdentitySignals(supabase, best.id, interactionId, speaker.identity_signals);

  const candidateIds = scored.filter((c) => c.score >= 0.2).map((c) => c.id);

  await supabase.from("disambiguation_queue").insert({
    user_id: userId,
    interaction_id: interactionId,
    detected_name: detectedName,
    candidate_people_ids: candidateIds,
    extracted_context: {
      speaker_id: speaker.speaker_id,
      identity_signals: speaker.identity_signals,
    },
    resolution_status: "pending",
  });

  return {
    speaker_id: speaker.speaker_id,
    person_id: best.id,
    resolution: "ambiguous",
    confidence: best.score,
  };
}

/**
 * Search for candidate people matching a detected name.
 * Checks: first_name, last_name, display_label, and identity_signals
 * for nickname/formal_name matches.
 */
async function findCandidates(
  supabase: SupabaseClient,
  userId: string,
  name: string
) {
  const normalized = name.toLowerCase().trim();
  const parts = normalized.split(/\s+/);
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : null;

  // Strip title prefixes for formal name matching (Mr., Ms., Dr., Prof.)
  const titleMatch = normalized.match(
    /^(?:mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?|professor)\s+(.+)$/i
  );
  const bareLastName = titleMatch ? titleMatch[1].split(/\s+/).pop()! : null;

  // Build the OR filter for the people table
  const orClauses: string[] = [
    `first_name.ilike.${first}%`,
    `display_label.ilike.%${first}%`,
  ];
  if (last) {
    orClauses.push(`last_name.ilike.${last}%`);
  }
  if (bareLastName) {
    orClauses.push(`last_name.ilike.${bareLastName}%`);
  }

  const { data: dbCandidates, error } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, display_label, identity_fingerprint, evolving_profile"
    )
    .eq("user_id", userId)
    .eq("is_merged", false)
    .or(orClauses.join(","));

  const candidates = [...(error || !dbCandidates ? [] : dbCandidates)];
  const candidateIds = new Set(candidates.map((c) => c.id));

  // Also search identity_signals for nickname / formal_name matches
  const signalSearchTerms = [normalized];
  if (bareLastName) signalSearchTerms.push(bareLastName);
  if (last && last !== first) signalSearchTerms.push(last);

  for (const term of signalSearchTerms) {
    const { data: signalMatches } = await supabase
      .from("identity_signals")
      .select("person_id")
      .in("signal_type", ["nickname", "formal_name", "full_name", "first_name", "last_name"])
      .ilike("signal_value", `%${term}%`);

    if (signalMatches) {
      const matchedPersonIds = [
        ...new Set(signalMatches.map((m) => m.person_id)),
      ].filter((pid) => !candidateIds.has(pid));

      if (matchedPersonIds.length > 0) {
        const { data: extraPeople } = await supabase
          .from("people")
          .select(
            "id, first_name, last_name, display_label, identity_fingerprint, evolving_profile"
          )
          .in("id", matchedPersonIds)
          .eq("user_id", userId)
          .eq("is_merged", false);

        if (extraPeople) {
          for (const p of extraPeople) {
            if (!candidateIds.has(p.id)) {
              candidates.push(p);
              candidateIds.add(p.id);
            }
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Extract first_name and last_name from identity signals.
 * Returns the highest-confidence value for each.
 */
function extractNameFields(signals: IdentitySignalExtracted[]): {
  firstName: string | null;
  lastName: string | null;
} {
  let firstName: string | null = null;
  let firstNameConf = 0;
  let lastName: string | null = null;
  let lastNameConf = 0;

  for (const s of signals) {
    if (s.signal_type === "first_name" && s.confidence > firstNameConf) {
      firstName = s.signal_value;
      firstNameConf = s.confidence;
    }
    if (s.signal_type === "last_name" && s.confidence > lastNameConf) {
      lastName = s.signal_value;
      lastNameConf = s.confidence;
    }
    if (s.signal_type === "full_name" && s.confidence > 0.5) {
      const parts = s.signal_value.split(/\s+/);
      if (parts.length >= 2) {
        if (s.confidence > firstNameConf) {
          firstName = parts[0];
          firstNameConf = s.confidence;
        }
        if (s.confidence > lastNameConf) {
          lastName = parts.slice(1).join(" ");
          lastNameConf = s.confidence;
        }
      }
    }
    if (s.signal_type === "formal_name" && s.confidence > 0.5) {
      // e.g. "Mr. Thompson" → last_name = "Thompson"
      const match = s.signal_value.match(
        /^(?:mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?|professor)\s+(.+)$/i
      );
      if (match && match[1]) {
        const formalLast = match[1].trim();
        if (s.confidence > lastNameConf) {
          lastName = formalLast;
          lastNameConf = s.confidence;
        }
      }
    }
  }

  // Fallback: parse detected_name if signals didn't yield names
  return { firstName, lastName };
}

async function createNewPerson(
  supabase: SupabaseClient,
  userId: string,
  speaker: SpeakerExtracted
) {
  // Extract name fields from signals first
  const signalNames = extractNameFields(speaker.identity_signals);

  // Fallback to parsing detected_name if signals didn't provide names
  let firstName = signalNames.firstName;
  let lastName = signalNames.lastName;

  if (!firstName && !lastName && speaker.detected_name) {
    const parts = speaker.detected_name.split(/\s+/);
    // Check if it's a formal name like "Mr. Thompson"
    const formalMatch = speaker.detected_name.match(
      /^(?:mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?|professor)\s+(.+)$/i
    );
    if (formalMatch) {
      lastName = formalMatch[1].trim();
    } else {
      firstName = parts[0];
      if (parts.length > 1) lastName = parts.slice(1).join(" ");
    }
  }

  // Build identity fingerprint from non-name signals
  const fingerprint: Record<string, string> = {};
  for (const signal of speaker.identity_signals) {
    if (signal.confidence >= 0.5) {
      fingerprint[signal.signal_type] = signal.signal_value;
    }
  }

  // Build display label
  const displayLabel = buildDisplayLabel(
    firstName,
    lastName,
    speaker.identity_signals
  );

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      display_label: displayLabel,
      identity_fingerprint: fingerprint,
      identity_confidence:
        speaker.identity_signals.length > 0
          ? speaker.identity_signals.reduce((sum, s) => sum + s.confidence, 0) /
            speaker.identity_signals.length
          : 0,
      interaction_count: 1,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create person: ${error.message}`);
  return data;
}

async function linkSpeaker(
  supabase: SupabaseClient,
  interactionId: string,
  personId: string,
  speaker: SpeakerExtracted,
  confidence: number
) {
  const speakerNum = parseInt(speaker.speaker_id.replace(/\D/g, ""), 10) || 0;

  await supabase.from("interaction_people").insert({
    interaction_id: interactionId,
    person_id: personId,
    speaker_id: speakerNum,
    confidence,
  });
}

async function storeIdentitySignals(
  supabase: SupabaseClient,
  personId: string,
  interactionId: string,
  signals: IdentitySignalExtracted[]
) {
  if (signals.length === 0) return;

  const rows = signals.map((s) => ({
    person_id: personId,
    interaction_id: interactionId,
    signal_type: s.signal_type,
    signal_value: s.signal_value,
    confidence: s.confidence,
  }));

  await supabase.from("identity_signals").insert(rows);
}

/**
 * Merge new signals into the person's identity_fingerprint, update name fields
 * from signals, and regenerate display_label.
 */
async function updatePersonProfile(
  supabase: SupabaseClient,
  personId: string,
  speaker: SpeakerExtracted,
  _interactionId: string
) {
  const { data: person } = await supabase
    .from("people")
    .select("first_name, last_name, identity_fingerprint, evolving_profile, interaction_count")
    .eq("id", personId)
    .single();

  if (!person) return;

  // Merge new signals into fingerprint
  const fingerprint =
    (person.identity_fingerprint as Record<string, string>) ?? {};
  for (const signal of speaker.identity_signals) {
    if (signal.confidence >= 0.5) {
      fingerprint[signal.signal_type] = signal.signal_value;
    }
  }

  // Update name fields from new signals if we get higher quality info
  const signalNames = extractNameFields(speaker.identity_signals);
  const firstName = signalNames.firstName ?? person.first_name;
  const lastName = signalNames.lastName ?? person.last_name;

  await supabase
    .from("people")
    .update({
      first_name: firstName,
      last_name: lastName,
      identity_fingerprint: fingerprint,
      interaction_count: (person.interaction_count ?? 0) + 1,
      last_seen: new Date().toISOString(),
    })
    .eq("id", personId);

  // Regenerate display label with updated signals
  await regenerateDisplayLabel(supabase, personId);
}
