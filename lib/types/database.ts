export interface User {
  id: string;
  email: string;
  name: string | null;
  omi_api_key: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_label: string | null;
  identity_fingerprint: Record<string, unknown>;
  identity_confidence: number;
  evolving_profile: Record<string, unknown>;
  topics_of_interest: unknown[];
  relationship_strength: string | null;
  first_seen: string;
  last_seen: string;
  interaction_count: number;
  is_merged: boolean;
  merged_into_id: string | null;
}

export interface Interaction {
  id: string;
  user_id: string;
  omi_conversation_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  raw_transcript: string | null;
  omi_summary: string | null;
  category: string | null;
  geolocation: Record<string, unknown> | null;
  is_relevant: boolean | null;
  relevance_score: number | null;
  pipeline_status: string | null;
}

export interface InteractionPerson {
  id: string;
  interaction_id: string;
  person_id: string;
  speaker_id: number | null;
  confidence: number | null;
}

export interface ExtractedDetail {
  id: string;
  interaction_id: string;
  person_id: string;
  detail_type: string;
  content: string;
  importance_score: number | null;
  source_quote: string | null;
  extracted_at: string;
}

export interface IdentitySignal {
  id: string;
  person_id: string;
  interaction_id: string;
  signal_type: string;
  signal_value: string;
  confidence: number | null;
  observed_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  source_person_id: string;
  target_person_id: string | null;
  interaction_id: string;
  insight_type: string;
  content: string;
  created_at: string;
}

export interface DisambiguationQueueItem {
  id: string;
  user_id: string;
  interaction_id: string;
  detected_name: string;
  candidate_people_ids: string[];
  extracted_context: Record<string, unknown>;
  resolution_status: "pending" | "resolved" | "skipped";
  resolved_person_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User> & Pick<User, "email">; Update: Partial<User> };
      people: { Row: Person; Insert: Partial<Person> & Pick<Person, "user_id">; Update: Partial<Person> };
      interactions: { Row: Interaction; Insert: Partial<Interaction> & Pick<Interaction, "user_id">; Update: Partial<Interaction> };
      interaction_people: { Row: InteractionPerson; Insert: Partial<InteractionPerson> & Pick<InteractionPerson, "interaction_id" | "person_id">; Update: Partial<InteractionPerson> };
      extracted_details: { Row: ExtractedDetail; Insert: Partial<ExtractedDetail> & Pick<ExtractedDetail, "interaction_id" | "person_id" | "detail_type" | "content">; Update: Partial<ExtractedDetail> };
      identity_signals: { Row: IdentitySignal; Insert: Partial<IdentitySignal> & Pick<IdentitySignal, "person_id" | "interaction_id" | "signal_type" | "signal_value">; Update: Partial<IdentitySignal> };
      insights: { Row: Insight; Insert: Partial<Insight> & Pick<Insight, "user_id" | "source_person_id" | "interaction_id" | "insight_type" | "content">; Update: Partial<Insight> };
      disambiguation_queue: { Row: DisambiguationQueueItem; Insert: Partial<DisambiguationQueueItem> & Pick<DisambiguationQueueItem, "user_id" | "interaction_id" | "detected_name">; Update: Partial<DisambiguationQueueItem> };
    };
  };
}
