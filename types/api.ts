// ---------------------------------------------------------------------------
// Shared API types
// ---------------------------------------------------------------------------

/** Standard success envelope. */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

/** Standard error envelope. */
export interface ApiError {
  error: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface PersonSummary {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  employer: string | null;
  school: string | null;
  userCurrentRole: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  fingerprint: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count: { interactionPeople: number };
}

export interface PersonDetail extends PersonSummary {
  notes: string | null;
  interactions: InteractionSummary[];
  extractedDetails: ExtractedDetailRow[];
  identitySignals: IdentitySignalRow[];
  insights: InsightRow[];
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export interface InteractionSummary {
  id: string;
  source: string;
  summary: string | null;
  interactionDate: string;
  processingStatus: string;
  location: string | null;
  people: { id: string; displayName: string }[];
}

export interface InteractionDetail extends InteractionSummary {
  rawTranscript: string | null;
  processedTranscript: string | null;
  durationSeconds: number | null;
  omiSessionId: string | null;
  extractedDetails: ExtractedDetailRow[];
}

// ---------------------------------------------------------------------------
// Extracted Details
// ---------------------------------------------------------------------------

export interface ExtractedDetailRow {
  id: string;
  interactionId: string;
  personId: string | null;
  category: string;
  detailKey: string;
  detailValue: string;
  confidence: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Identity Signals
// ---------------------------------------------------------------------------

export interface IdentitySignalRow {
  id: string;
  personId: string;
  interactionId: string;
  signalType: string;
  signalValue: string;
  confidence: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export interface InsightRow {
  id: string;
  userId: string;
  personId: string | null;
  insightType: string;
  content: string;
  metadata: unknown;
  createdAt: string;
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Disambiguation
// ---------------------------------------------------------------------------

export interface DisambiguationRow {
  id: string;
  speakerLabel: string;
  candidatePersonIds: string[];
  identitySignalsSnapshot: unknown;
  status: string;
  createdAt: string;
  interaction: { id: string; interactionDate: string; summary: string | null };
  candidatePeople: { id: string; displayName: string; fingerprint: unknown }[];
}
