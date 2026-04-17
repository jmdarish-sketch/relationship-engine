import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueProcessing } from "@/lib/pipeline/queue";

/**
 * POST /api/webhook/omi
 *
 * Public endpoint — Omi sends conversation transcripts here.
 * Authenticated via ?uid= query param (user's id) or omi_api_key.
 * Creates an interaction and triggers async processing.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // --- Authenticate ---
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawUid = request.nextUrl.searchParams.get("uid");
  // Omi may append its own ?uid= param to our URL, producing a value like
  // "our-uuid?uid=omi-uid". Strip anything after '?' to recover our UUID.
  const cleanUid = rawUid?.split("?")[0] ?? null;
  const omiAppendedUid = rawUid && rawUid.includes("?") ? rawUid.split("?")[1]?.replace("uid=", "") : null;

  // TODO: We may want to store omiAppendedUid as omiUserId on the User record later
  if (omiAppendedUid) {
    console.log(`[omi-webhook] Omi appended uid: ${omiAppendedUid} (our uid: ${cleanUid})`);
  }

  if (cleanUid && !UUID_RE.test(cleanUid)) {
    return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
  }

  const apiKey = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const webhookSecret = process.env.OMI_WEBHOOK_SECRET;

  let userId: string | null = null;

  if (cleanUid) {
    const user = await prisma.user.findUnique({
      where: { id: cleanUid },
      select: { id: true },
    });
    if (user) userId = user.id;
  }

  if (!userId && apiKey) {
    // Look up user by API key
    const user = await prisma.user.findFirst({
      where: { omiApiKey: apiKey },
      select: { id: true },
    });
    if (user) userId = user.id;
  }

  if (!userId && webhookSecret && apiKey === webhookSecret) {
    // Fallback: global webhook secret (for testing)
    // Requires uid param to identify the user
    return NextResponse.json(
      { error: "uid query param required with webhook secret" },
      { status: 400 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse Omi payload ---
  const sessionId = (body.session_id ?? body.id) as string | undefined;
  const segments = body.segments as
    | { text: string; speaker: string; start: number; end: number }[]
    | undefined;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id" },
      { status: 400 }
    );
  }

  // Skip discarded conversations
  if (body.discarded === true) {
    return NextResponse.json({ status: "discarded" });
  }

  // Check for duplicates by omi_session_id
  const existing = await prisma.interaction.findFirst({
    where: { omiSessionId: sessionId, userId },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({
      status: "duplicate",
      interaction_id: existing.id,
    });
  }

  // Build transcript from segments
  let rawTranscript = "";
  if (segments && segments.length > 0) {
    rawTranscript = formatTranscript(segments);
  } else if (typeof body.transcript === "string") {
    rawTranscript = body.transcript;
  }

  // Also handle Omi's transcript_segments format
  const transcriptSegments = body.transcript_segments as
    | {
        text: string;
        speaker: string;
        speaker_id: number;
        is_user: boolean;
        start: number;
        end: number;
      }[]
    | undefined;

  if (!rawTranscript && transcriptSegments?.length) {
    rawTranscript = formatOmiTranscriptSegments(transcriptSegments);
  }

  // Compute duration from segments
  let durationSeconds: number | null = null;
  const allSegments = segments ?? transcriptSegments;
  if (allSegments && allSegments.length > 0) {
    const maxEnd = Math.max(...allSegments.map((s) => s.end));
    durationSeconds = Math.round(maxEnd);
  }

  // Extract structured summary if present
  const structured = body.structured as
    | { overview?: string; category?: string }
    | undefined;

  // Parse interaction date
  const interactionDate = body.started_at
    ? new Date(body.started_at as string)
    : new Date();

  // Create the interaction
  const interaction = await prisma.interaction.create({
    data: {
      userId,
      source: "omi",
      rawTranscript: rawTranscript || null,
      summary: structured?.overview ?? null,
      interactionDate,
      durationSeconds,
      omiSessionId: sessionId,
      processingStatus: rawTranscript ? "pending" : "completed",
    },
  });

  // Trigger async processing if there's a transcript
  if (rawTranscript) {
    enqueueProcessing(interaction.id);
  }

  return NextResponse.json({
    status: "accepted",
    interaction_id: interaction.id,
  });
}

// ---------------------------------------------------------------------------
// Transcript formatting
// ---------------------------------------------------------------------------

function formatTranscript(
  segments: { text: string; speaker: string; start: number; end: number }[]
): string {
  const lines: string[] = [];
  let currentSpeaker: string | null = null;
  let currentTexts: string[] = [];

  for (const seg of segments) {
    if (seg.speaker !== currentSpeaker) {
      if (currentSpeaker && currentTexts.length > 0) {
        lines.push(`${currentSpeaker}: ${currentTexts.join(" ")}`);
      }
      currentSpeaker = seg.speaker;
      currentTexts = [seg.text.trim()];
    } else {
      currentTexts.push(seg.text.trim());
    }
  }

  if (currentSpeaker && currentTexts.length > 0) {
    lines.push(`${currentSpeaker}: ${currentTexts.join(" ")}`);
  }

  return lines.join("\n");
}

function formatOmiTranscriptSegments(
  segments: {
    text: string;
    speaker: string;
    speaker_id: number;
    is_user: boolean;
    start: number;
    end: number;
  }[]
): string {
  const lines: string[] = [];
  let currentLabel: string | null = null;
  let currentTexts: string[] = [];

  for (const seg of segments) {
    const label = seg.is_user
      ? "USER"
      : `SPEAKER_${String(seg.speaker_id).padStart(2, "0")}`;

    if (label !== currentLabel) {
      if (currentLabel && currentTexts.length > 0) {
        lines.push(`${currentLabel}: ${currentTexts.join(" ")}`);
      }
      currentLabel = label;
      currentTexts = [seg.text.trim()];
    } else {
      currentTexts.push(seg.text.trim());
    }
  }

  if (currentLabel && currentTexts.length > 0) {
    lines.push(`${currentLabel}: ${currentTexts.join(" ")}`);
  }

  return lines.join("\n");
}
