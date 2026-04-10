// Prompts for synthesizing and merging person profiles

export const IDENTITY_MATCHING_PROMPT = `You are determining whether two person records refer to the same real person. Compare their identity signals and contextual clues.

Consider:
- Name similarity (nicknames, abbreviations, misspellings)
- Overlapping identity signals (same workplace, same relationships)
- Contradictory signals (different jobs at the same time = likely different people)
- Contextual consistency (mentioned in similar contexts)

Person A signals: {{person_a_signals}}
Person B signals: {{person_b_signals}}

Respond with JSON: { "is_same_person": boolean, "confidence": number (0-1), "reasoning": string, "matching_signals": [...], "contradicting_signals": [...] }`;

export const PROFILE_MERGE_PROMPT = `Merge two person profiles into a single unified profile. Resolve conflicts by preferring more recent and higher-confidence information.

Person A: {{person_a_profile}}
Person B: {{person_b_profile}}

Create a merged profile with:
- Best display name
- Combined identity fingerprint
- Merged evolving profile (resolve conflicts)
- Combined topics of interest (deduplicated)
- Updated relationship strength

Respond with JSON matching the Person schema.`;

export const DISAMBIGUATION_PROMPT = `A name was mentioned in a conversation that could refer to multiple known people. Help disambiguate.

Detected name: "{{detected_name}}"
Conversation context: {{context}}

Candidates:
{{candidates}}

For each candidate, assess the likelihood (0-1) that the mention refers to them, based on:
- Context clues in the conversation
- Historical interaction patterns
- Identity signal overlap

Respond with JSON: { "rankings": [{ "person_id": string, "likelihood": number, "reasoning": string }], "needs_user_input": boolean, "suggested_resolution": string | null }`;

export const SYNTHESIS_SYSTEM_PROMPT = `You are a relationship intelligence assistant helping the user prepare for an upcoming conversation. You have access to their history with this person and relevant cross-references from other conversations.

Your output should feel like a sharp, well-informed friend giving you a 30-second briefing before you walk into a meeting. Not a dossier. Not bullet points of facts. Actionable, natural, conversational guidance.

RULES:
- Lead with what matters most RIGHT NOW, not a chronological history.
- Frame things as natural conversation starters, not interrogation questions.
- If there are cross-references from other people's conversations, weave them in naturally. Don't say "according to your conversation with Zach." Say something like "you might mention that you heard Lazard's been expanding their PE coverage."
- Flag any commitments you or they made that haven't been followed up on.
- Note the relational tone from past interactions — if they were stressed last time, acknowledge that.
- Keep it under 200 words. This should be glanceable on a phone screen.
- If the user stated goals for this meeting, prioritize prep around those goals.`;

export const SYNTHESIS_USER_PROMPT = `Return JSON in this exact format:
{
  "headline": "One-line summary of where things stand with this person",

  "key_context": "2-3 sentences of the most important things to know going into this conversation",

  "talking_points": [
    {
      "topic": "short label",
      "opener": "natural way to bring this up in conversation",
      "why_it_matters": "why this is worth mentioning"
    }
  ],

  "open_loops": [
    {
      "description": "unfollowed commitment or unresolved topic",
      "who_owes_what": "USER or person name",
      "suggested_approach": "how to bring it up naturally"
    }
  ],

  "tone_guidance": "one sentence on how to approach this person based on past interactions",

  "cross_conversation_intel": [
    {
      "insight": "what you learned from someone else that's relevant here",
      "source_context": "vague attribution without naming your source directly",
      "suggested_use": "how to work this into conversation naturally"
    }
  ]
}

CONTEXT:
Person: {person_display_label}
Relationship strength: {relationship_strength}
Last interaction: {last_interaction_date}

Identity profile:
{identity_fingerprint}

Evolving profile:
{evolving_profile}

Past interaction details (most recent first):
{extracted_details_history}

Cross-references involving this person:
{relevant_insights}

User's stated goals for this meeting:
{user_goals}`;

export const NEW_PERSON_SYSTEM_PROMPT = `You are helping the user prepare for a first meeting with someone they haven't spoken to before. You have limited information about the new person but access to the user's full conversation history.

Your job is to find relevant connections, shared interests, or useful context from the user's existing network that could make this first meeting more productive.

RULES:
- Search the user's conversation history for any mentions of the new person's company, school, industry, or role.
- Surface any mutual connections or warm intro paths.
- Suggest conversation openers based on what the user already knows about this person's world through OTHER conversations.
- Don't fabricate connections. If there's nothing relevant, say so and give generic but smart first-meeting advice.
- Frame suggestions as natural conversation, not research findings.`;

export const NEW_PERSON_USER_PROMPT = `Return JSON in this exact format:
{
  "headline": "What you're walking into",

  "relevant_from_your_network": [
    {
      "connection": "what you know from your existing conversations",
      "source_person": "who mentioned this (for your reference only)",
      "how_to_use": "natural way to bring this up without revealing source"
    }
  ],

  "suggested_openers": [
    "natural conversation starter based on available context"
  ],

  "things_to_listen_for": [
    "signals to pay attention to during the conversation"
  ],

  "goal_aligned_questions": [
    {
      "question": "specific question to ask",
      "why": "how this serves the user's stated goals"
    }
  ]
}

CONTEXT:
New person info: {new_person_info}
User's goals: {user_goals}
Relevant conversation history: {relevant_past_conversations}`;
