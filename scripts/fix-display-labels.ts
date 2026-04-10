import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const USER_ID = "b56afcb3-4f92-4e9a-9467-3105972f34dd";

const NAME_SIGNAL_TYPES = new Set([
  "first_name",
  "last_name",
  "full_name",
  "formal_name",
  "nickname",
]);

const CONTEXT_SIGNAL_PRIORITY = [
  "employer",
  "startup",
  "company",
  "school",
  "role",
  "major",
  "hobby",
  "personal_interest",
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
  const formalSignal = signals
    .filter((s) => s.signal_type === "formal_name")
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (firstName && lastName) {
    namePart = `${firstName} ${lastName}`;
  } else if (fullNameSignal) {
    namePart = fullNameSignal.signal_value;
  } else if (formalSignal) {
    namePart = formalSignal.signal_value;
  } else if (firstName) {
    namePart = firstName;
  } else if (lastName) {
    namePart = lastName;
  } else {
    namePart = "Unknown";
  }

  let contextClue: string | null = null;
  for (const type of CONTEXT_SIGNAL_PRIORITY) {
    const match = signals
      .filter((s) => s.signal_type === type && s.confidence >= 0.4)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (match) {
      contextClue = match.signal_value;
      break;
    }
  }

  return contextClue ? `${namePart} — ${contextClue}` : namePart;
}

function extractNameFields(
  signals: { signal_type: string; signal_value: string; confidence: number }[]
): { firstName: string | null; lastName: string | null } {
  let firstName: string | null = null;
  let firstNameConf = 0;
  let lastName: string | null = null;
  let lastNameConf = 0;

  for (const s of signals) {
    if (s.signal_type === "first_name" && s.confidence > firstNameConf) {
      firstName = s.signal_value;
      firstNameConf = s.confidence;
    }
    if (s.signal_type === "last_name" && s.confidence > lastNameConf) {
      lastName = s.signal_value;
      lastNameConf = s.confidence;
    }
    if (s.signal_type === "full_name" && s.confidence > 0.5) {
      const parts = s.signal_value.split(/\s+/);
      if (parts.length >= 2) {
        if (s.confidence > firstNameConf) {
          firstName = parts[0];
          firstNameConf = s.confidence;
        }
        if (s.confidence > lastNameConf) {
          lastName = parts.slice(1).join(" ");
          lastNameConf = s.confidence;
        }
      }
    }
    if (s.signal_type === "formal_name" && s.confidence > 0.5) {
      const match = s.signal_value.match(
        /^(?:mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?|professor)\s+(.+)$/i
      );
      if (match?.[1]) {
        if (s.confidence > lastNameConf) {
          lastName = match[1].trim();
          lastNameConf = s.confidence;
        }
      }
    }
  }

  return { firstName, lastName };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.\n" +
        "Run with: npx tsx --env-file=.env.local scripts/fix-display-labels.ts"
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Fetch all people for this user
  const { data: people, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, display_label")
    .eq("user_id", USER_ID)
    .eq("is_merged", false)
    .order("last_seen", { ascending: false });

  if (error || !people) {
    console.error("Failed to fetch people:", error);
    process.exit(1);
  }

  console.log(`Found ${people.length} people to process.\n`);

  for (const person of people) {
    const oldLabel = person.display_label;

    // Fetch all signals for this person
    const { data: signals } = await supabase
      .from("identity_signals")
      .select("signal_type, signal_value, confidence, observed_at")
      .eq("person_id", person.id)
      .order("observed_at", { ascending: false });

    if (!signals || signals.length === 0) {
      console.log(`  ${oldLabel ?? "Unknown"} — no signals, skipping`);
      continue;
    }

    // Extract best name fields from signals
    const nameFields = extractNameFields(signals);
    const firstName = nameFields.firstName ?? person.first_name;
    const lastName = nameFields.lastName ?? person.last_name;

    // For context signals, prefer the most recent entry per type
    const latestContextSignals: {
      signal_type: string;
      signal_value: string;
      confidence: number;
    }[] = [];
    const seenContextTypes = new Set<string>();
    for (const s of signals) {
      if (
        !NAME_SIGNAL_TYPES.has(s.signal_type) &&
        !seenContextTypes.has(s.signal_type)
      ) {
        seenContextTypes.add(s.signal_type);
        latestContextSignals.push(s);
      }
    }

    // For name signals, keep highest confidence per type
    const nameSignals: {
      signal_type: string;
      signal_value: string;
      confidence: number;
    }[] = [];
    const seenNameTypes = new Set<string>();
    const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);
    for (const s of sorted) {
      if (NAME_SIGNAL_TYPES.has(s.signal_type) && !seenNameTypes.has(s.signal_type)) {
        seenNameTypes.add(s.signal_type);
        nameSignals.push(s);
      }
    }

    const allSignals = [...nameSignals, ...latestContextSignals];
    const newLabel = buildDisplayLabel(firstName, lastName, allSignals);

    // Update person
    await supabase
      .from("people")
      .update({
        first_name: firstName,
        last_name: lastName,
        display_label: newLabel,
      })
      .eq("id", person.id);

    const changed = oldLabel !== newLabel;
    console.log(
      `  ${changed ? "UPDATED" : "  (same)"} | ${oldLabel} → ${newLabel}` +
        (firstName !== person.first_name || lastName !== person.last_name
          ? ` | name: ${person.first_name ?? "null"}/${person.last_name ?? "null"} → ${firstName ?? "null"}/${lastName ?? "null"}`
          : "")
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
