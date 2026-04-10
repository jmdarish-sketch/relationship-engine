// Prompts for AI-powered extraction from conversation transcripts

export const RELEVANCE_FILTER_PROMPT = `You are a quick classifier. Determine if this conversation transcript has relationship or networking value worth saving.

Answer YES if the conversation:
- Involves a meaningful exchange with an identifiable person
- Contains information about someone's career, interests, plans, or situation
- Includes commitments, introductions, or follow-up opportunities
- Is a professional or networking interaction

Answer NO if the conversation:
- Is ordering food, transit directions, or transactional
- Is with a stranger you'll never see again (cashier, driver)
- Contains no identifiable personal or professional information
- Is purely logistical with no relationship context

Return ONLY this JSON:
{
  "is_relevant": boolean,
  "confidence": 0.0-1.0,
  "reason": "one sentence explanation"
}`;

export const EXTRACTION_SYSTEM_PROMPT = `You are a relationship intelligence engine. You analyze conversation transcripts captured by a wearable device and extract information that would be useful for maintaining and deepening professional and personal relationships.

The user wearing the device is referred to as "USER". All other speakers are contacts the user is building relationships with.

Your job is NOT to summarize. Your job is to extract specific, concrete details that would make the user sound thoughtful and attentive in a future conversation with this person.

RULES:
- Be specific, not generic. "Interested in finance" is useless. "Recruiting for Evercore's TMT group, stressed about case prep" is useful.
- Capture exact names, companies, schools, roles when mentioned.
- Distinguish between facts (they work at X) and impressions (they seemed frustrated about Y).
- If someone mentions another person by name, always capture that as a cross-reference.
- Ignore small talk, greetings, filler. Only extract what has relationship value.
- If the transcript is just casual/social with no extractable relationship data, return is_relevant: false.
- Names evolve. Someone might be introduced as "Mr. Thompson" in one conversation and later referred to as "Dave Thompson" or just "Dave". Extract ALL name forms you hear — first name, last name, full name, formal address (Mr./Ms./Dr.), and nicknames. Use signal_types: "first_name", "last_name", "full_name", "formal_name", "nickname". Each form gets its own identity signal.
- If someone is only referred to by a title and last name (Mr. Chen, Dr. Williams, Professor Garcia), extract the last name with signal_type "last_name" and the formal form with signal_type "formal_name". The first name may come in a later conversation.
- Context clues change over time. Someone might be "recruiting at Evercore" today and "working at Centerview" six months from now. Always extract current status with high confidence. The system handles temporal changes downstream.`;

export const EXTRACTION_USER_PROMPT = `Analyze the following transcript and return JSON in this exact format:

{
  "is_relevant": boolean,
  "relevance_score": 0.0-1.0,

  "speakers": [
    {
      "speaker_id": "SPEAKER_00",
      "detected_name": "first name or full name if mentioned",
      "identity_signals": [
        {
          "signal_type": "first_name|last_name|full_name|formal_name|nickname|employer|school|major|role|age|grad_year|hometown|meeting_context|mutual_connection|physical_description",
          "signal_value": "string",
          "confidence": 0.0-1.0,
          "source_quote": "brief quote from transcript supporting this signal"
        }
      ]
    }
  ],

  "extracted_details": [
    {
      "person": "speaker name or SPEAKER_XX",
      "detail_type": "career_update|personal_interest|opinion|goal|struggle|ask|offer|plan|achievement|life_event|preference",
      "content": "Specific, concrete detail in one sentence",
      "importance_score": 0.0-1.0,
      "source_quote": "brief quote from transcript"
    }
  ],

  "cross_references": [
    {
      "mentioned_by": "speaker name",
      "mentioned_person": "name of person referenced",
      "context": "what was said about them",
      "relationship_to_speaker": "friend|colleague|classmate|recruiter|etc",
      "actionable": boolean
    }
  ],

  "action_items": [
    {
      "owner": "USER or speaker name",
      "description": "specific commitment made",
      "deadline_mentioned": "string or null",
      "importance": 0.0-1.0
    }
  ],

  "relational_tone": {
    "overall_vibe": "warm|neutral|tense|guarded|excited|vulnerable",
    "speakers_dynamic": "description of the relationship dynamic observed",
    "topics_to_revisit": ["topics they seemed passionate about"],
    "topics_to_avoid": ["topics that caused discomfort or shutdown"]
  }
}

TRANSCRIPT:
`;
