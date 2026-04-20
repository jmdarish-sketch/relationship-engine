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
 * Prep brief: generate a high-signal conversational briefing before meeting someone.
 * Receives full interaction history, extracted details, and action items so every
 * recommendation is grounded in specific conversation data.
 */
export function prepBriefPrompt(
  personData: {
    displayName: string;
    firstName: string | null;
    fingerprint: unknown;
    employer: string | null;
    school: string | null;
    userCurrentRole: string | null;
  },
  recentDetails: { category: string; key: string; value: string; confidence: number | null; createdAt: Date }[],
  interactions: { id: string; summary: string | null; date: Date; source: string; transcript: string | null }[],
  recentInsights: { insightType: string; content: string; createdAt: Date }[],
  profileSummary: string | null,
  userName: string | null
) {
  const userContext = profileSummary
    ? `ABOUT YOU (${userName ?? "the user"}): ${profileSummary}`
    : userName ? `ABOUT YOU: ${userName}` : "";

  const interactionLog = interactions.length > 0
    ? interactions.map((i) => {
        const dateStr = i.date.toISOString().slice(0, 10);
        const transcript = i.transcript ? `\n  Transcript excerpt: ${i.transcript.slice(0, 800)}` : "";
        return `- ${dateStr} (${i.source}): ${i.summary ?? "No summary"}${transcript}`;
      }).join("\n")
    : "No interactions recorded.";

  const detailsText = recentDetails.length > 0
    ? recentDetails.map((d) => {
        const date = d.createdAt.toISOString().slice(0, 10);
        return `- [${d.category}/${d.key}] ${d.value} (${date})`;
      }).join("\n")
    : "No extracted details.";

  const actionItems = recentDetails
    .filter((d) => d.category === "action_item")
    .map((d) => `- ${d.value} (extracted ${d.createdAt.toISOString().slice(0, 10)})`)
    .join("\n") || "None.";

  const insightsText = recentInsights.length > 0
    ? recentInsights.map((i) => `- [${i.insightType}] ${i.content.slice(0, 200)}`).join("\n")
    : "None.";

  return {
    system: `You are a relationship intelligence engine generating a prep brief for an upcoming meeting. The user is a college student networking for IB/startup/career opportunities. They will scan this on their phone 2 minutes before a coffee chat.

HARD RULES:
1. Generic LinkedIn-tier advice is failure. Every item must be grounded in specific conversation history or extracted relationship data provided below.
2. Empty arrays and null fields are better than fabricated content. If there isn't enough signal for a watch-out, return empty. If there's no real ask, return has_ask: false.
3. Never reference information that wasn't in the input data. No inference about their mood, career trajectory, or opinions unless explicitly stated in interactions.
4. Open loops (promises, intros, follow-ups, questions left unanswered) are the highest-value section. Be thorough — check every interaction for unfulfilled commitments.
5. Conversation hooks must each reference something the contact actually said or something extracted from prior interactions. Do NOT include generic openers like "congrats on the promotion" or "how's work going."
6. Today's date is ${new Date().toISOString().slice(0, 10)}. Use it to compute time-since values accurately.

Return ONLY valid JSON matching this exact schema — no prose, no markdown fences:
{
  "meeting_purpose": "One-sentence strategic framing of why this meeting matters. NOT 'catch up with X'. Name specific threads and outcomes.",
  "since_last_contact": {
    "time_since_last_interaction": "e.g. '3 weeks'",
    "whats_new_for_them": ["Only things known to have changed since last interaction. Empty if nothing known."]
  },
  "what_they_know_about_you": ["What the contact has been told about the user in past conversations. Helps user avoid re-explaining."],
  "open_loops": [
    {
      "thread": "The unresolved item — be specific",
      "status": "user_owes | they_owe | mutual | dormant",
      "age": "How long it's been open, computed from interaction dates",
      "suggested_move": "How to naturally surface it — not just 'ask about it'"
    }
  ],
  "conversation_hooks": [
    {
      "hook": "What to bring up — specific, not generic",
      "grounded_in": "Exact reference to past conversation with date",
      "why_it_lands": "One sentence on why this shows you listened"
    }
  ],
  "watch_outs": ["Only if there's actual negative signal in conversation history. Empty array is fine and common."],
  "the_ask": {
    "has_ask": true,
    "what_you_want": "Specific desired outcome — not 'career advice'",
    "how_to_raise_it": "Concrete bridging sequence, not just 'ask him'"
  }
}

If the_ask has no clear purpose beyond catching up, set has_ask to false with null fields. That's valid.

--- FEW-SHOT EXAMPLES ---

Here is an example of a BAD brief and a GOOD brief for the same contact with identical input data. Study the difference — the bad version is what we had before and is considered a failure mode.

EXAMPLE INPUT (for both):
Contact: George Chen. Ross alum (2019), VP at JPMorgan healthcare IB.
Interactions:
- Feb 12: Met at Ross alumni event. George mentioned his sophomore Pfizer internship got him into healthcare. "Waiting to hear back" on promotion. Brother just started at Ross. Offered to answer IB questions.
- Feb 28: 45-min coffee. VP promotion confirmed. Compared healthcare IB vs other groups. Said he'd send a healthcare M&A reading list. Offered intro to former associate at Evercore. Jacob mentioned building a relationship-tracking app — George asked to see a demo "sometime."
- Mar 15: 20-min Zoom. George mentioned his team hiring a summer analyst, posting going up soon. Still hadn't sent the reading list.
Action items: George owes reading list. George owes Evercore intro. Jacob owes George app demo.

BAD OUTPUT (failure mode):
{"meeting_purpose":"Catch up with George and discuss career","since_last_contact":{"time_since_last_interaction":"about a month","whats_new_for_them":["George has been promoted to VP at JPMorgan"]},"open_loops":[{"thread":"Follow up on career advice","status":"mutual","age":"a while","suggested_move":"Ask George for his thoughts"}],"conversation_hooks":[{"hook":"Congrats on the VP promotion — what's changed?","grounded_in":"His recent promotion","why_it_lands":"Acknowledges success"}],"watch_outs":["Be respectful of his time"],"the_ask":{"has_ask":true,"what_you_want":"Career advice","how_to_raise_it":"Ask about pathways into IB"}}

Why BAD: meeting_purpose generic. Promotion is stale (7 weeks old). Open loops fabricated — the REAL open loops (reading list, Evercore intro, demo) are missing. Hooks are LinkedIn-tier. Watch-out fabricated. Ask is vague.

GOOD OUTPUT (quality bar):
{"meeting_purpose":"Cash in on George's standing offer to answer IB questions — and nudge on the two things he owes you (healthcare M&A reading list, Evercore intro). Also show him the app demo he asked about.","since_last_contact":{"time_since_last_interaction":"5 weeks","whats_new_for_them":["His team's summer analyst cohort posting is going up (last mentioned Mar 15) — may be live now"]},"what_they_know_about_you":["Ross senior exploring IB vs startup paths","Interested in healthcare coverage specifically","Building a relationship-tracking app — he asked to see a demo 'sometime'","You found him through the Ross alumni network"],"open_loops":[{"thread":"George promised to send a healthcare M&A reading list","status":"they_owe","age":"7 weeks (offered Feb 28, not sent as of Mar 15)","suggested_move":"Don't ask directly — bring up a healthcare M&A topic you're curious about and let him naturally remember. If he doesn't, close with 'would still love that reading list whenever you get a chance.'"},{"thread":"George offered to intro you to his former associate who moved to Evercore","status":"they_owe","age":"7 weeks","suggested_move":"Ask something specific about Evercore's healthcare practice — gives him an organic reason to re-offer the intro."},{"thread":"You owe George a demo of the relationship-tracking app","status":"user_owes","age":"7 weeks","suggested_move":"Bring it up early — offer a 2-min walkthrough on your phone. Good reciprocity move before you ask for anything."},{"thread":"Summer analyst cohort hiring at his team","status":"dormant","age":"5 weeks","suggested_move":"Ask if the posting is live yet and whether it's worth applying given your timeline."}],"conversation_hooks":[{"hook":"How's your brother finding Ross so far?","grounded_in":"Feb 12 — mentioned his younger brother just started at Ross","why_it_lands":"Personal, specific, shows you retained a detail most people would forget"},{"hook":"You mentioned Pfizer was what got you into healthcare — what did that internship actually look like day-to-day?","grounded_in":"Feb 12 intro conversation about his sophomore internship","why_it_lands":"Gets him talking about formative experience, opens door to your own internship questions"},{"hook":"Curious how the VP transition has actually changed your work — more deal origination, less modeling?","grounded_in":"Promotion confirmed Feb 28, now 7 weeks into the role","why_it_lands":"Specific enough to show you understand IB role structure, not generic 'congrats' energy"}],"watch_outs":[],"the_ask":{"has_ask":true,"what_you_want":"Referral or active consideration for JPMorgan healthcare IB summer analyst cohort","how_to_raise_it":"Walk through the healthcare pathway discussion first, reference your existing healthcare interest, then transition: 'You mentioned your team's hiring — would it make sense for me to put my resume in front of you directly, or is there a different door I should knock on?'"}}

Why GOOD: meeting_purpose names specific threads. Only genuinely new info in whats_new_for_them. All 4 real open loops caught with specific suggested_moves. Hooks reference dated moments. Watch-outs empty (correct). Ask is specific with bridging sequence.

--- END EXAMPLES ---`,
    user: `${userContext}

CONTACT: ${personData.displayName}
${personData.userCurrentRole ? `Role: ${personData.userCurrentRole}` : ""}
${personData.employer ? `Employer: ${personData.employer}` : ""}
${personData.school ? `School: ${personData.school}` : ""}
Fingerprint: ${JSON.stringify(personData.fingerprint)}

INTERACTION HISTORY (most recent first):
${interactionLog}

EXTRACTED DETAILS:
${detailsText}

ACTION ITEMS:
${actionItems}

PRIOR INSIGHTS/CROSS-REFERENCES:
${insightsText}`,
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
