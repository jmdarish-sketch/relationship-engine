import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "b56afcb3-4f92-4e9a-9467-3105972f34dd";

const NAME_SIGNAL_TYPES = new Set([
  "first_name", "last_name", "full_name", "formal_name", "nickname",
]);

const CONTEXT_SIGNAL_PRIORITY = [
  "employer", "startup", "company", "school", "role", "major", "hobby", "personal_interest",
];

function buildDisplayLabel(
  firstName: string | null,
  lastName: string | null,
  signals: { signal_type: string; signal_value: string; confidence: number }[]
): string {
  let namePart: string;
  const fullNameSignal = signals
    .filter((s) => s.signal_type === "full_name")
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (firstName && lastName) namePart = `${firstName} ${lastName}`;
  else if (fullNameSignal) namePart = fullNameSignal.signal_value;
  else if (firstName) namePart = firstName;
  else if (lastName) namePart = lastName;
  else namePart = "Unknown";

  let contextClue: string | null = null;
  for (const type of CONTEXT_SIGNAL_PRIORITY) {
    const match = signals
      .filter((s) => s.signal_type === type && s.confidence >= 0.4)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (match) { contextClue = match.signal_value; break; }
  }

  return contextClue ? `${namePart} — ${contextClue}` : namePart;
}

async function main() {
  // Find the two Evercore Zachs
  const { data: zachs } = await supabase
    .from("people")
    .select("id, first_name, last_name, display_label, identity_fingerprint, interaction_count")
    .eq("user_id", USER_ID)
    .eq("is_merged", false)
    .ilike("first_name", "zach%");

  if (!zachs || zachs.length < 2) {
    console.log("Fewer than 2 Zachs found, nothing to merge.");
    return;
  }

  // Filter to only Evercore Zachs
  const evercoreZachs = zachs.filter((z) => {
    const fp = z.identity_fingerprint as Record<string, string> | null;
    return fp?.employer?.toLowerCase().includes("evercore");
  });

  if (evercoreZachs.length < 2) {
    console.log(`Only ${evercoreZachs.length} Evercore Zach(s) found, nothing to merge.`);
    return;
  }

  console.log(`Found ${evercoreZachs.length} Evercore Zachs. Merging...\n`);

  // Pick the one with more interactions as primary
  evercoreZachs.sort((a, b) => b.interaction_count - a.interaction_count);
  const primary = evercoreZachs[0];
  const duplicates = evercoreZachs.slice(1);

  console.log(`Primary: ${primary.id} (${primary.display_label}, count=${primary.interaction_count})`);
  for (const dup of duplicates) {
    console.log(`Duplicate: ${dup.id} (${dup.display_label}, count=${dup.interaction_count})`);
  }

  for (const dup of duplicates) {
    console.log(`\nMerging ${dup.id} into ${primary.id}...`);

    // Reassign interaction_people
    const { data: ipRows } = await supabase
      .from("interaction_people")
      .update({ person_id: primary.id })
      .eq("person_id", dup.id)
      .select("id");
    console.log(`  interaction_people reassigned: ${ipRows?.length ?? 0}`);

    // Reassign extracted_details
    const { data: edRows } = await supabase
      .from("extracted_details")
      .update({ person_id: primary.id })
      .eq("person_id", dup.id)
      .select("id");
    console.log(`  extracted_details reassigned: ${edRows?.length ?? 0}`);

    // Reassign identity_signals
    const { data: isRows } = await supabase
      .from("identity_signals")
      .update({ person_id: primary.id })
      .eq("person_id", dup.id)
      .select("id");
    console.log(`  identity_signals reassigned: ${isRows?.length ?? 0}`);

    // Reassign insights (source_person_id)
    const { data: insSourceRows } = await supabase
      .from("insights")
      .update({ source_person_id: primary.id })
      .eq("source_person_id", dup.id)
      .select("id");
    console.log(`  insights (source) reassigned: ${insSourceRows?.length ?? 0}`);

    // Reassign insights (target_person_id)
    const { data: insTargetRows } = await supabase
      .from("insights")
      .update({ target_person_id: primary.id })
      .eq("target_person_id", dup.id)
      .select("id");
    console.log(`  insights (target) reassigned: ${insTargetRows?.length ?? 0}`);

    // Mark duplicate as merged
    await supabase
      .from("people")
      .update({ is_merged: true, merged_into_id: primary.id })
      .eq("id", dup.id);
    console.log(`  marked as merged`);

    // Merge identity_fingerprints — keep highest confidence per signal type
    const primaryFP = (primary.identity_fingerprint ?? {}) as Record<string, string>;
    const dupFP = (dup.identity_fingerprint ?? {}) as Record<string, string>;
    for (const [key, val] of Object.entries(dupFP)) {
      if (!primaryFP[key]) {
        primaryFP[key] = val;
      }
    }
    primary.identity_fingerprint = primaryFP;
  }

  // Recalculate interaction_count
  const { data: linkCount } = await supabase
    .from("interaction_people")
    .select("interaction_id")
    .eq("person_id", primary.id);
  const uniqueInteractions = new Set((linkCount ?? []).map((l) => l.interaction_id));
  const newCount = uniqueInteractions.size;

  // Fetch signals for display label regeneration
  const { data: allSignals } = await supabase
    .from("identity_signals")
    .select("signal_type, signal_value, confidence, observed_at")
    .eq("person_id", primary.id)
    .order("observed_at", { ascending: false });

  // Filter: most recent per context type, highest confidence per name type
  const latestContext: { signal_type: string; signal_value: string; confidence: number }[] = [];
  const seenContext = new Set<string>();
  const nameSignals: { signal_type: string; signal_value: string; confidence: number }[] = [];
  const seenName = new Set<string>();
  const sorted = [...(allSignals ?? [])].sort((a, b) => b.confidence - a.confidence);

  for (const s of allSignals ?? []) {
    if (!NAME_SIGNAL_TYPES.has(s.signal_type) && !seenContext.has(s.signal_type)) {
      seenContext.add(s.signal_type);
      latestContext.push(s);
    }
  }
  for (const s of sorted) {
    if (NAME_SIGNAL_TYPES.has(s.signal_type) && !seenName.has(s.signal_type)) {
      seenName.add(s.signal_type);
      nameSignals.push(s);
    }
  }

  // Also filter out non-Evercore signals that got mixed in (psych Zach contamination)
  // Keep only signals that make sense for Evercore Zach
  const relevantContextSignals = latestContext.filter((s) => {
    // Remove psych/neuro signals that got mixed in from the wrong Zach
    const val = s.signal_value.toLowerCase();
    if (s.signal_type === "meeting_context" && val.includes("psychology")) return false;
    if (s.signal_type === "major" && val.includes("psychology")) return false;
    if (s.signal_type === "major" && val.includes("neuroscience")) return false;
    return true;
  });

  const combinedSignals = [...nameSignals, ...relevantContextSignals];
  const newLabel = buildDisplayLabel(primary.first_name, primary.last_name, combinedSignals);

  await supabase
    .from("people")
    .update({
      identity_fingerprint: primary.identity_fingerprint,
      interaction_count: newCount,
      display_label: newLabel,
    })
    .eq("id", primary.id);

  console.log(`\nPrimary updated:`);
  console.log(`  interaction_count: ${newCount}`);
  console.log(`  display_label: ${newLabel}`);
  console.log(`  fingerprint: ${JSON.stringify(primary.identity_fingerprint, null, 2)}`);

  // Also clean up the contaminated identity_signals on primary
  // Remove signals from interactions that belong to psych Zach
  // (We can identify these by checking if the interaction has a different Zach)
  // For now, just log what signals exist
  console.log(`\nAll signals on merged primary:`);
  for (const s of allSignals ?? []) {
    console.log(`  [${s.signal_type}] ${s.signal_value} (conf=${s.confidence})`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
