// Types for the LLM extraction pipeline responses

export interface RelevanceFilterResult {
  is_relevant: boolean;
  confidence: number;
  reason: string;
}

export interface IdentitySignalExtracted {
  signal_type: string;
  signal_value: string;
  confidence: number;
  source_quote: string;
}

export interface SpeakerExtracted {
  speaker_id: string;
  detected_name: string | null;
  identity_signals: IdentitySignalExtracted[];
}

export interface DetailExtracted {
  person: string;
  detail_type: string;
  content: string;
  importance_score: number;
  source_quote: string;
}

export interface CrossReference {
  mentioned_by: string;
  mentioned_person: string;
  context: string;
  relationship_to_speaker: string;
  actionable: boolean;
}

export interface ActionItem {
  owner: string;
  description: string;
  deadline_mentioned: string | null;
  importance: number;
}

export interface RelationalTone {
  overall_vibe: string;
  speakers_dynamic: string;
  topics_to_revisit: string[];
  topics_to_avoid: string[];
}

export interface ExtractionResult {
  is_relevant: boolean;
  relevance_score: number;
  speakers: SpeakerExtracted[];
  extracted_details: DetailExtracted[];
  cross_references: CrossReference[];
  action_items: ActionItem[];
  relational_tone: RelationalTone;
}

// Omi API types
export interface OmiTranscriptSegment {
  text: string;
  speaker: string;
  speaker_id: number;
  is_user: boolean;
  start: number;
  end: number;
}

export interface OmiStructuredSummary {
  title: string;
  overview: string;
  emoji: string;
  category: string;
  action_items: { description: string; completed: boolean }[];
  events: unknown[];
}

export interface OmiConversation {
  id: string;
  created_at: string;
  started_at: string;
  finished_at: string;
  transcript_segments: OmiTranscriptSegment[];
  structured: OmiStructuredSummary;
  geolocation: { latitude: number; longitude: number } | null;
  discarded: boolean;
}
