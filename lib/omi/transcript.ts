import type { OmiTranscriptSegment } from "@/lib/types";

/**
 * Convert Omi transcript segments into a readable transcript string.
 * Groups consecutive segments by the same speaker.
 */
export function formatTranscript(segments: OmiTranscriptSegment[]): string {
  if (!segments || segments.length === 0) return "";

  const lines: string[] = [];
  let currentSpeaker: string | null = null;
  let currentTexts: string[] = [];

  for (const segment of segments) {
    const label = segment.is_user ? "USER" : `SPEAKER_${String(segment.speaker_id).padStart(2, "0")}`;

    if (label !== currentSpeaker) {
      if (currentSpeaker && currentTexts.length > 0) {
        lines.push(`${currentSpeaker}: ${currentTexts.join(" ")}`);
      }
      currentSpeaker = label;
      currentTexts = [segment.text.trim()];
    } else {
      currentTexts.push(segment.text.trim());
    }
  }

  // Flush last speaker
  if (currentSpeaker && currentTexts.length > 0) {
    lines.push(`${currentSpeaker}: ${currentTexts.join(" ")}`);
  }

  return lines.join("\n");
}
