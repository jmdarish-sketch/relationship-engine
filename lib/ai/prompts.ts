// ---------------------------------------------------------------------------
// All AI prompt templates. Each returns { system, user } for the model call.
// Prompts request structured JSON and inject user context where relevant.
// ---------------------------------------------------------------------------

/**
 * Stage 1: Quick relevance check with Haiku.
 * Filters out noise — background audio, ordering food, transit directions.
 * Only passes through conversations with meaningful interpersonal content.
 */
export function relevanceFilterPrompt(transcript: string) {
  return {
    system: `You are a quick classifier. Determine if this conversation transcript has relationship or networking value worth saving.

Answer YES if:
- Meaningful exchange with an identifiable person
- Contains career, education, interests, plans, or personal info
- Includes commitments, introductions, or follow-ups
- Professional or networking interaction

Answer NO if:
- Ordering food, transit, purely transactional
- With a stranger you'll never see again (cashier, driver)
- No identifiable personal or professional information
- Background noise, garbled audio, or self-talk

Return ONLY this JSON:
{
  "is_relevant": boolean,
  "confidence": 0.0-1.0,
  "reason": "one sentence"
}`,
    user: `TRANSCRIPT:\n${transcript}`,
  };
}

/**
 * Stage 2: Full extraction with Sonnet.
 * This is the core intelligence — extracts structured relationship data
 * from raw conversation transcripts. The user's profile_summary is injected
 * so the model knows who the "user" speaker is and can frame details accordingly.
 */
export function extractionPrompt(
  transcript: string,
  profileSummary: string | null
) {
  const userContext = profileSummary
    ? `\nABOUT THE USER (the person wearing the recording device):\n${profileSummary}\n`
    : "";

  return {
    system: `You are a relationship intelligence engine. You analyze conversation transcripts from a wearable device and extract structured data useful for maintaining professional and personal relationships.

The device wearer is "USER". All other speakers are contacts.

RULES:
- Be specific, not generic. "Interested in finance" is useless. "Recruiting for Evercore's TMT group, stressed about case prep" is useful.
- Extract ALL name forms: first name, last name, nicknames, formal names.
- Capture exact companies, schools, roles, and titles.
- Distinguish facts ("works at X") from impressions ("seemed frustrated about Y").
- If someone mentions another person by name, capture it as a cross-reference.
- Ignore small talk, greetings, filler. Only extract what has relationship value.
- If the transcript has no extractable relationship data, set is_relevant: false.

Return ONLY valid JSON in this exact format:
{
  "is_relevant": boolean,
  "conversation_summary": "2-3 sentence summary of what was discussed",
  "relational_tone": "e.g. professional/warm, casual/friendly, transactional",
  "speakers": [
    {
      "label": "Speaker 1 or the name used in transcript",
      "probable_name": "best guess at their name, or null",
      "identity_signals": {
        "names": ["all name forms heard"],
        "employers": ["companies mentioned"],
        "roles": ["job titles or descriptions"],
        "schools": ["educational institutions"],
        "interests": ["hobbies, topics they care about"],
        "locations": ["where they live/work"],
        "other": ["any other identifying info"]
      }
    }
  ],
  "extracted_details": [
    {
      "speaker_label": "which speaker this is about",
      "category": "career|education|personal|preference|action_item|relationship|opinion",
      "key": "short label like 'employer' or 'follow_up'",
      "value": "specific detail in one sentence",
      "confidence": 0.0-1.0
    }
  ],
  "action_items": [
    {
      "description": "specific commitment or follow-up",
      "assignee_label": "USER or speaker label",
      "deadline": "mentioned deadline or null"
    }
  ],
  "cross_references": [
    {
      "mentioned_by": "speaker label",
      "person_name": "name of person referenced",
      "context": "what was said about them",
      "relationship": "how they relate to the speaker"
    }
  ]
}`,
    user: `${userContext}TRANSCRIPT:\n${transcript}`,
  };
}

/**
 * Stage 3: Speaker resolution with Haiku.
 * Compares extracted identity signals against existing person fingerprints
 * to determine if a speaker matches a known contact.
 */
export function speakerResolutionPrompt(
  extractedSignals: Record<string, string[]>,
  candidates: { id: string; displayName: string; fingerprint: unknown }[]
) {
  const candidateList = candidates
    .map(
      (c, i) =>
        `Candidate ${i + 1} (id: ${c.id}): ${c.displayName}\n  Fingerprint: ${JSON.stringify(c.fingerprint)}`
    )
    .join("\n\n");

  return {
    system: `You are matching a speaker from a conversation to known contacts. Compare the identity signals extracted from the conversation against each candidate's fingerprint.

Score each candidate 0.0-1.0 based on:
- Name matches (exact, nickname, formal variants) — strongest signal
- Employer/role matches — strong signal
- School matches — moderate signal
- Interest/topic overlaps — weak signal
- Contradictions (different employer at same time) — strong negative

Return ONLY this JSON:
{
  "matches": [
    {
      "candidate_id": "uuid",
      "confidence": 0.0-1.0,
      "reasoning": "brief explanation"
    }
  ],
  "best_match_id": "uuid or null if no good match",
  "best_confidence": 0.0-1.0
}`,
    user: `EXTRACTED SIGNALS FROM NEW CONVERSATION:\n${JSON.stringify(extractedSignals, null, 2)}\n\nKNOWN CONTACTS:\n${candidateList || "No existing contacts found."}`,
  };
}

/**
 * Prep brief: generate a conversational briefing before meeting someone.
 * Injected with user profile so the brief can highlight shared interests,
 * relevant offers, and appropriate conversation starters.
 */
export function prepBriefPrompt(
  personData: {
    displayName: string;
    fingerprint: unknown;
    employer: string | null;
    school: string | null;
  },
  recentDetails: { category: string; key: string; value: string }[],
  recentInsights: { content: string }[],
  profileSummary: string | null
) {
  const userContext = profileSummary
    ? `About you (the user): ${profileSummary}\n\n`
    : "";

  const details = recentDetails
    .map((d) => `[${d.category}/${d.key}] ${d.value}`)
    .join("\n");

  const insights = recentInsights.map((i) => i.content).join("\n");

  return {
    system: `You are a relationship intelligence assistant preparing a conversational briefing. Write in second person ("You should mention..."). Be specific and actionable — not a dossier, but a 30-second briefing a sharp friend would give you before a meeting.

RULES:
- Lead with what matters RIGHT NOW
- Frame things as natural conversation starters
- Flag unfulfilled commitments
- Note relational tone from past interactions
- Keep under 200 words
- Return JSON:
{
  "headline": "one-line summary of where things stand",
  "key_context": "2-3 sentences of what to know going in",
  "talking_points": [{ "topic": "", "opener": "", "why": "" }],
  "open_loops": [{ "description": "", "owner": "USER or name", "approach": "" }],
  "tone_guidance": "one sentence"
}`,
    user: `${userContext}Person: ${personData.displayName}
Employer: ${personData.employer ?? "Unknown"}
School: ${personData.school ?? "Unknown"}
Fingerprint: ${JSON.stringify(personData.fingerprint)}

Known details:\n${details || "None yet"}

Cross-references / insights:\n${insights || "None yet"}`,
  };
}

/**
 * Outreach: generate channel-specific messages for reaching out.
 * User profile + skills injected so messages can reference shared interests
 * and offer value based on the user's capabilities.
 */
export function outreachPrompt(
  personData: {
    displayName: string;
    fingerprint: unknown;
    employer: string | null;
    school: string | null;
  },
  recentDetails: { category: string; key: string; value: string }[],
  profileSummary: string | null
) {
  const userContext = profileSummary
    ? `About the sender (user): ${profileSummary}\n\n`
    : "";

  const details = recentDetails
    .map((d) => `[${d.category}/${d.key}] ${d.value}`)
    .join("\n");

  return {
    system: `You are a networking strategist. Suggest 3 outreach messages across different channels. Messages should be natural, reference specifics from past conversations, and not be salesy.

Constraints:
- LinkedIn: under 100 words
- Text: under 50 words
- Email: under 150 words with subject line
- Prioritize unfulfilled commitments and follow-ups
- Weave in cross-conversation intel naturally

Return JSON:
{
  "strategies": [
    {
      "channel": "linkedin|text|email",
      "rationale": "why this channel and timing",
      "subject": "email subject only, omit for others",
      "message": "ready-to-send message",
      "tone": "warm|professional|casual"
    }
  ]
}`,
    user: `${userContext}Person: ${personData.displayName}
Employer: ${personData.employer ?? "Unknown"}
School: ${personData.school ?? "Unknown"}
Fingerprint: ${JSON.stringify(personData.fingerprint)}

Known details:\n${details || "None yet"}`,
  };
}

/**
 * Generate a user profile summary from onboarding data.
 * Used as context in all downstream prompts.
 */
export function profileSummaryPrompt(data: {
  fullName: string;
  currentRole?: string | null;
  school?: string | null;
  major?: string | null;
  graduationYear?: number | null;
  careerInterests?: string[];
  networkingGoals?: string | null;
  personalInterests?: string[];
  skills?: string[];
}) {
  const parts = [
    `Name: ${data.fullName}`,
    data.currentRole ? `Role: ${data.currentRole}` : null,
    data.school ? `School: ${data.school}` : null,
    data.major ? `Major: ${data.major}` : null,
    data.graduationYear ? `Graduation: ${data.graduationYear}` : null,
    data.careerInterests?.length
      ? `Career interests: ${data.careerInterests.join(", ")}`
      : null,
    data.networkingGoals ? `Networking goals: ${data.networkingGoals}` : null,
    data.personalInterests?.length
      ? `Personal interests: ${data.personalInterests.join(", ")}`
      : null,
    data.skills?.length ? `Skills: ${data.skills.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system:
      "Summarize this person's professional profile in 2-3 sentences. Include their current situation, career goals, and key strengths. Write in third person. This will be injected as context into AI prompts.",
    user: parts,
  };
}
