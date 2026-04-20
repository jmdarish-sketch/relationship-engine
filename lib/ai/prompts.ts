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
  profileData: Record<string, unknown> | null,
  userName: string | null
) {
  // Build structured user context from profileData + profileSummary
  const userContextParts: string[] = [];
  if (userName) userContextParts.push(`Name: ${userName}`);
  if (profileData) {
    if (profileData.current_role) userContextParts.push(`Current status: ${profileData.current_role}`);
    if (profileData.school) userContextParts.push(`School: ${profileData.school}`);
    if (profileData.graduation_year) userContextParts.push(`Graduation year: ${profileData.graduation_year}`);
    if (profileData.major) userContextParts.push(`Major: ${profileData.major}`);
    if (Array.isArray(profileData.career_interests) && profileData.career_interests.length > 0)
      userContextParts.push(`Career interests: ${profileData.career_interests.join(", ")}`);
    if (profileData.networking_goals) userContextParts.push(`Networking goals: ${profileData.networking_goals}`);
    if (Array.isArray(profileData.skills) && profileData.skills.length > 0)
      userContextParts.push(`Skills: ${profileData.skills.join(", ")}`);
  }
  if (profileSummary) userContextParts.push(`Profile summary: ${profileSummary}`);

  const userContext = userContextParts.length > 0
    ? `USER PROFILE:\n${userContextParts.join("\n")}`
    : "USER PROFILE: No profile data available.";

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
    system: `You are a relationship intelligence engine generating a prep brief for an upcoming meeting. The user will scan this on their phone 2 minutes before a coffee chat.

HARD RULES:
1. Generic LinkedIn-tier advice is failure. Every item must be grounded in specific conversation history or extracted relationship data provided below.
2. Empty arrays and null fields are better than fabricated content. If there isn't enough signal for a watch-out, return empty. If there's no real ask, return has_ask: false.
3. Never reference information that wasn't in the input data. No inference about their mood, career trajectory, or opinions unless explicitly stated in interactions.
4. Open loops (promises, intros, follow-ups, questions left unanswered) are the highest-value section. Be thorough — check every interaction for unfulfilled commitments.
5. Conversation hooks must each reference something the contact actually said or something extracted from prior interactions. Do NOT include generic openers like "congrats on the promotion" or "how's work going."
6. Today's date is ${new Date().toISOString().slice(0, 10)}. Use it to compute time-since values accurately.

USER-CONTEXT CALIBRATION:
You will receive the user's profile as part of the input (year in school, career stage, goals, recruiting status, etc.). Before generating the brief, assess:

1. Timeline position — where is the user in their career arc?
   - Pre-recruiting (freshman, sophomore pre-summer): asks are about learning, positioning, staying on radar for future recruiting
   - Active recruiting (junior summer, senior full-time, job-searching): asks can be direct — referrals, consideration, intros
   - Employed/established: asks are peer-level — advice, collaboration, mutual value

2. Power dynamic with the contact:
   - User is junior to contact (student→professional, junior→senior): mentor/mentee frame, user asks for guidance, contact gives wisdom
   - Peer-level: mutual exchange, neither side "owes" the other
   - User is senior to contact: user may be offering opportunities, contact may be seeking them

3. Realistic asks at this stage:
   - A pre-recruiting student asking a senior professional for a referral is premature and damages the relationship — the right ask is advice on how to prepare
   - A recruiting student asking for a referral is appropriate — frame it as accepting their offered help
   - A professional asking another professional for a job is transactional — frame it as exploring mutual fit

The meeting_purpose, open_loops suggested_moves, the_ask.what_you_want, and the_ask.how_to_raise_it must all reflect this calibration. Do NOT default to transactional recruiting framing unless the user's context warrants it. Do NOT default to mentor-seeking framing unless the user's context warrants it. Read the user's actual position and calibrate.

If the user profile is sparse or missing, default to neutral framing — build/maintain the relationship without a specific transactional ask (set has_ask: false). Better to under-ask than to ask wrong.

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
- Feb 12: Met at alumni networking event. George mentioned his sophomore Pfizer internship got him into healthcare. "Waiting to hear back" on promotion. Brother just started at Ross. Offered to answer IB questions.
- Feb 28: 45-min coffee. VP promotion confirmed. Compared healthcare IB vs other groups. Said he'd send a healthcare M&A reading list. Offered intro to former associate at Evercore. User mentioned building a relationship-tracking app — George asked to see a demo "sometime."
- Mar 15: 20-min Zoom. George mentioned his team hiring a summer analyst, posting going up soon. Still hadn't sent the reading list.
Action items: George owes reading list. George owes Evercore intro. User owes George app demo.
(No user profile included in this example — the structural principles below apply regardless of user context.)

BAD OUTPUT (failure mode):
{"meeting_purpose":"Catch up with George and discuss career","since_last_contact":{"time_since_last_interaction":"about a month","whats_new_for_them":["George has been promoted to VP at JPMorgan"]},"open_loops":[{"thread":"Follow up on career advice","status":"mutual","age":"a while","suggested_move":"Ask George for his thoughts"}],"conversation_hooks":[{"hook":"Congrats on the VP promotion — what's changed?","grounded_in":"His recent promotion","why_it_lands":"Acknowledges success"}],"watch_outs":["Be respectful of his time"],"the_ask":{"has_ask":true,"what_you_want":"Career advice","how_to_raise_it":"Ask about pathways into IB"}}

Why BAD: meeting_purpose generic — any meeting could have this purpose. Promotion is stale (7 weeks old), not "new." Open loops fabricated and vague — the REAL open loops (reading list, Evercore intro, demo) are completely missing. Hooks are LinkedIn-tier with no dated references. Watch-out fabricated from nothing. Ask is vague and ungrounded.

Note: the strategic framing in meeting_purpose and the_ask below assumes a hypothetical user context. The actual output must be calibrated to the real user's profile (year, recruiting timeline, goals, power dynamic with contact) — see calibration rules in the system prompt. The structure, grounding, and specificity principles demonstrated here apply universally.

GOOD OUTPUT (quality bar):
{"meeting_purpose":"Follow up on George's standing offer to answer IB questions — nudge on the two things he owes (healthcare M&A reading list, Evercore intro) and deliver the app demo he asked about.","since_last_contact":{"time_since_last_interaction":"5 weeks","whats_new_for_them":["His team's summer analyst cohort posting is going up (last mentioned Mar 15) — may be live now"]},"what_they_know_about_you":["Exploring IB vs startup paths","Interested in healthcare coverage specifically","Building a relationship-tracking app — he asked to see a demo 'sometime'","Connected through an alumni networking event"],"open_loops":[{"thread":"George promised to send a healthcare M&A reading list","status":"they_owe","age":"7 weeks (offered Feb 28, not sent as of Mar 15)","suggested_move":"Don't ask directly — bring up a healthcare M&A topic you're curious about and let him naturally remember. If he doesn't, close with 'would still love that reading list whenever you get a chance.'"},{"thread":"George offered to intro to his former associate who moved to Evercore","status":"they_owe","age":"7 weeks","suggested_move":"Ask something specific about Evercore's healthcare practice — gives him an organic reason to re-offer the intro."},{"thread":"You owe George a demo of the relationship-tracking app","status":"user_owes","age":"7 weeks","suggested_move":"Bring it up early — offer a 2-min walkthrough on your phone. Good reciprocity move before you ask for anything."},{"thread":"Summer analyst cohort hiring at his team","status":"dormant","age":"5 weeks","suggested_move":"Ask if the posting is live yet and what the timeline looks like."}],"conversation_hooks":[{"hook":"How's your brother finding Ross so far?","grounded_in":"Feb 12 — mentioned his younger brother just started at Ross","why_it_lands":"Personal, specific, shows you retained a detail most people would forget"},{"hook":"You mentioned Pfizer was what got you into healthcare — what did that internship actually look like day-to-day?","grounded_in":"Feb 12 intro conversation about his sophomore internship","why_it_lands":"Gets him talking about a formative experience and opens door to deeper questions"},{"hook":"Curious how the VP transition has actually changed your work — more deal origination, less modeling?","grounded_in":"Promotion confirmed Feb 28, now 7 weeks into the role","why_it_lands":"Specific enough to show familiarity with IB role structure, not generic 'congrats' energy"}],"watch_outs":[],"the_ask":{"has_ask":true,"what_you_want":"Guidance on whether the summer analyst cohort is realistic given your timeline, plus activation of the Evercore intro","how_to_raise_it":"After discussing the healthcare pathway, transition: 'You mentioned your team's hiring — is there a way to learn more about that cohort?' For Evercore: ask about their healthcare practice and let him naturally re-offer."}}

Why GOOD: meeting_purpose names specific threads and deliverables. Only genuinely new info in whats_new_for_them (cohort posting, not the stale promotion). All 4 real open loops caught with tactful suggested_moves that aren't just "ask about it." Hooks reference specific dated moments from past conversations — none could be generated from LinkedIn alone. Watch-outs correctly empty (no negative signal in history). the_ask is specific and actionable with a concrete bridging sequence grounded in the conversation flow.

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
 * Outreach: generate strategically distinct outreach moves.
 * Receives full interaction history, extracted details, and user profile
 * so every strategy is grounded in specific relationship data.
 */
export function outreachPrompt(
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
  profileData: Record<string, unknown> | null,
  userName: string | null
) {
  const userContextParts: string[] = [];
  if (userName) userContextParts.push(`Name: ${userName}`);
  if (profileData) {
    if (profileData.current_role) userContextParts.push(`Current status: ${profileData.current_role}`);
    if (profileData.school) userContextParts.push(`School: ${profileData.school}`);
    if (profileData.graduation_year) userContextParts.push(`Graduation year: ${profileData.graduation_year}`);
    if (profileData.major) userContextParts.push(`Major: ${profileData.major}`);
    if (Array.isArray(profileData.career_interests) && profileData.career_interests.length > 0)
      userContextParts.push(`Career interests: ${profileData.career_interests.join(", ")}`);
    if (profileData.networking_goals) userContextParts.push(`Networking goals: ${profileData.networking_goals}`);
    if (Array.isArray(profileData.skills) && profileData.skills.length > 0)
      userContextParts.push(`Skills: ${profileData.skills.join(", ")}`);
  }
  if (profileSummary) userContextParts.push(`Profile summary: ${profileSummary}`);
  const userContext = userContextParts.length > 0
    ? `USER PROFILE:\n${userContextParts.join("\n")}`
    : "USER PROFILE: No profile data available.";

  const interactionLog = interactions.length > 0
    ? interactions.map((i) => {
        const dateStr = i.date.toISOString().slice(0, 10);
        const transcript = i.transcript ? `\n  Transcript excerpt: ${i.transcript.slice(0, 600)}` : "";
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
    system: `You are a relationship intelligence engine generating outreach strategies. The user wants to reach out to a contact and needs 2-4 strategically distinct moves to choose from.

Today's date is ${new Date().toISOString().slice(0, 10)}.

USER-CONTEXT CALIBRATION:
You will receive the user's profile. Before generating strategies, assess:
1. Timeline position: pre-recruiting (learning/positioning), active recruiting (direct asks OK), employed/established (peer-level exchange)
2. Power dynamic: junior-to-senior (mentee frame), peer-level (mutual value), senior-to-junior (offering opportunities)
3. Calibrate message tone, ask level, and framing to the user's actual position. A freshman's "direct nudge" is still a learning-oriented ask. A director's "soft check-in" can reference mutual deal flow.
If the user profile is sparse, default to neutral relationship-building framing.

STRATEGIC DISTINCTNESS:
Each strategy must represent a GENUINELY DIFFERENT MOVE, not a different phrasing of the same ask. Real strategic dimensions:
- WHO LEADS: user asks for something vs. user offers something vs. mutual check-in with no ask
- TEMPO: direct ask now vs. warm-up first (ask later) vs. just staying on radar
- OPEN LOOP FOCUS: nudge on what they owe vs. deliver what user owes vs. open a new thread
- REGISTER: professional follow-up vs. casual/personal check-in vs. substantive question that invites real engagement
Two "strategies" that differ only in channel or tone are the SAME strategy. If you can't articulate the strategic difference in one sentence, they're not distinct enough.

CHANNEL SELECTION:
Each strategy gets ONE channel. Choose based on:
- Relationship warmth: casual check-ins → text if numbers exchanged, otherwise LinkedIn; professional asks → email
- Message length: anything >3 short paragraphs → email
- Contact's likely preferred channel based on communication history (if known)
Do NOT generate multiple channel variants of the same strategy.

NO STALE-NEWS OPENERS:
If something happened >3 weeks ago, don't open with "congrats on X" as if it's fresh. Reference older events in the body as context, not as the lede.

GROUNDING:
Every strategy's why_this_works and grounded_in must cite specific moments from the interaction history. If a strategy can't be grounded in real history, don't generate it — generate fewer strategies instead.

MESSAGE QUALITY:
message.body is the actual draft the user will send. It must:
- Sound like a real person wrote it, not an AI
- Reference specific shared context (the actual thing discussed, not "as we discussed" placeholder energy)
- Be sized for the channel: text 1-3 sentences, LinkedIn 2-4 sentences, email 1-2 short paragraphs max
- Have a clear CTA if the strategy calls for one, and explicitly no CTA if the strategy is "just stay on radar"
- Avoid filler: "Hope you're doing well", "Just wanted to reach out", "Always great connecting with fellow [group]", school cheers (unless the contact used them first)
- Match the tone: casual / professional / warm should feel actually different

Return ONLY valid JSON matching this schema — no prose, no markdown fences:
{
  "strategies": [
    {
      "id": "snake_case_strategy_name",
      "name": "2-4 word action-oriented name",
      "one_liner": "Single sentence describing the strategic move (NOT the message itself)",
      "channel": "email | linkedin | text | whatsapp",
      "tone": "casual | professional | warm",
      "message": {
        "subject": "email subject or null",
        "body": "the actual draft message"
      },
      "why_this_works": "1-2 sentences grounded in relationship history",
      "grounded_in": ["Specific reference to past interaction/detail with date"]
    }
  ],
  "context_note": "Optional note if user should know something before picking a strategy. Null if not needed."
}

Return 2-4 strategies. If history is too thin for 2 distinct strategies, return 1 and explain in context_note.

--- FEW-SHOT EXAMPLE ---

EXAMPLE INPUT:
Contact: George Chen. Ross alum (2019), VP at JPMorgan healthcare IB.
Interactions:
- Feb 12: Met at alumni networking event. George mentioned his sophomore Pfizer internship got him into healthcare. "Waiting to hear back" on promotion. Brother just started at Ross. Offered to answer IB questions.
- Feb 28: 45-min coffee. VP promotion confirmed. Compared healthcare IB vs other groups. Said he'd send a healthcare M&A reading list. Offered intro to former associate at Evercore. User mentioned building a relationship-tracking app — George asked to see a demo "sometime."
- Mar 15: 20-min Zoom. George mentioned his team hiring a summer analyst, posting going up soon. Still hadn't sent the reading list.
Action items: George owes reading list. George owes Evercore intro. User owes George app demo.
(No user profile in this example — structural principles apply universally.)

BAD OUTPUT (failure mode):
{"strategies":[{"id":"email_outreach","name":"Email Follow-up","one_liner":"Send a professional email to reconnect","channel":"email","tone":"professional","message":{"subject":"Great connecting at the alumni event","body":"Hi George, Hope you're doing well! Congrats again on the VP promotion — well deserved. I really enjoyed our conversations about healthcare IB. Would love to stay in touch and continue learning from your experience. Let me know if you ever have time for a quick chat. Best regards"},"why_this_works":"Professional channel for a professional contact","grounded_in":["Met at alumni event"]},{"id":"linkedin_message","name":"LinkedIn Message","one_liner":"Send a casual LinkedIn message to stay connected","channel":"linkedin","tone":"warm","message":{"subject":null,"body":"Hey George! Great connecting at the Ross event. Congrats on the VP role! Would love to stay connected and hear more about healthcare IB at JPM. Always great connecting with fellow Wolverines. Go Blue!"},"why_this_works":"LinkedIn is good for professional networking","grounded_in":["Ross alumni connection"]},{"id":"text_message","name":"Quick Text","one_liner":"Send a brief text to check in","channel":"text","tone":"casual","message":{"subject":null,"body":"Hey George, hope you're doing well! Let me know if you're ever free to grab coffee again. Would love to catch up."},"why_this_works":"Texting is more personal","grounded_in":["Had coffee previously"]}],"context_note":null}

Why BAD: All three are the SAME strategy (vague reconnection) on different channels. Stale "congrats on the VP promotion" opener (7 weeks old). Zero mention of the 3 real open loops (reading list, Evercore intro, demo). Messages are pure filler — "Hope you're doing well", "stay in touch", "Go Blue!" No specific references to anything from the actual conversations. Grounded_in is vague hand-waving, not dated references.

Note: strategic framing below assumes a hypothetical user context. Actual output must be calibrated to the real user's profile per the calibration rules. The structure, distinctness, and grounding principles demonstrated here apply universally.

GOOD OUTPUT (quality bar):
{"strategies":[{"id":"reciprocity_first","name":"Deliver the demo first","one_liner":"Lead with what you owe George (the app demo he asked to see) before asking for anything.","channel":"text","tone":"casual","message":{"subject":null,"body":"Hey George — finally got that relationship-tracking app to a point worth showing. Want to do a quick 5-min walkthrough next time you have a breather? No rush, just figured I owed you that demo."},"why_this_works":"You owe him the demo from Feb 28. Leading with reciprocity builds goodwill and gives you a natural reason to re-engage before nudging on things he owes you.","grounded_in":["Feb 28 — George asked to see a demo of the relationship-tracking app 'sometime'","User has owed this demo for 7 weeks"]},{"id":"direct_nudge","name":"Nudge the reading list","one_liner":"Directly follow up on the healthcare M&A reading list George promised, framed as genuine interest.","channel":"email","tone":"professional","message":{"subject":"Healthcare M&A reading — still interested","body":"George,\\n\\nDuring our coffee in February you mentioned a healthcare M&A reading list you'd send over. I've been digging into the space more since then and would genuinely find it useful if you still have it handy.\\n\\nAlso — you mentioned your team's summer analyst posting was going up around mid-March. Did that end up going live? Curious what the timeline looks like.\\n\\nAppreciate it."},"why_this_works":"The reading list has been outstanding for 7 weeks (offered Feb 28, undelivered as of Mar 15). Framing it as genuine interest rather than 'you forgot' makes it easy for George to follow through without feeling called out. The summer analyst question is a natural second ask since he surfaced it.","grounded_in":["Feb 28 — offered to send healthcare M&A reading list","Mar 15 — still hadn't sent it","Mar 15 — mentioned summer analyst cohort posting going up"]},{"id":"warm_check_in","name":"Personal check-in, no ask","one_liner":"Re-engage through personal connection (his brother at Ross) with zero transactional ask — just stay on radar.","channel":"text","tone":"warm","message":{"subject":null,"body":"Hey George — random question: how's your brother liking Ross so far? Curious if he's doing the whole club recruiting thing or charting his own path. Hope the VP life is treating you well."},"why_this_works":"Referencing his brother (mentioned Feb 12) shows genuine memory of personal details. A no-ask message after 5 weeks of silence resets the relationship dynamic before any future transactional ask.","grounded_in":["Feb 12 — George mentioned his younger brother just started at Ross","Last contact was Mar 15 (5 weeks ago) — re-engagement before asking for things"]}],"context_note":"It's been 5 weeks since last contact (Mar 15 Zoom). George has two outstanding items he owes (reading list, Evercore intro). Consider leading with reciprocity (the demo) or a personal check-in before nudging on what he owes."}

Why GOOD: Three genuinely distinct strategies: reciprocity-first (lead with what user owes), direct-nudge (ask for what they owe), warm check-in (no ask, stay on radar). Each has its own channel matched to the strategic move. Messages reference specific dated interactions — the demo, the reading list, the brother. No stale "congrats" openers. Grounded_in cites specific dates and moments. Context_note helps the user decide which strategy to pick.

--- END EXAMPLE ---`,
    user: `${userContext}

CONTACT: ${personData.displayName}
${personData.firstName ? `First name: ${personData.firstName}` : ""}
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
