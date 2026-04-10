import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "b56afcb3-4f92-4e9a-9467-3105972f34dd";

async function main() {
  const { data: zachs } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, display_label, identity_fingerprint, interaction_count, identity_confidence"
    )
    .eq("user_id", USER_ID)
    .ilike("first_name", "zach%");

  console.log(`Found ${zachs?.length ?? 0} Zachs:\n`);

  for (const z of zachs ?? []) {
    console.log("=".repeat(60));
    console.log(`ID:          ${z.id}`);
    console.log(`Name:        ${z.first_name} ${z.last_name ?? "(no last)"}`);
    console.log(`Label:       ${z.display_label}`);
    console.log(`Count:       ${z.interaction_count}`);
    console.log(`Confidence:  ${z.identity_confidence}`);
    console.log(
      `Fingerprint: ${JSON.stringify(z.identity_fingerprint, null, 2)}`
    );

    const { data: signals } = await supabase
      .from("identity_signals")
      .select("signal_type, signal_value, confidence, interaction_id")
      .eq("person_id", z.id)
      .order("confidence", { ascending: false });

    console.log(`\nSignals (${signals?.length ?? 0}):`);
    for (const s of signals ?? []) {
      console.log(
        `  [${s.signal_type}] ${s.signal_value} (conf=${s.confidence}) interaction=${s.interaction_id}`
      );
    }
    console.log();
  }

  // All people summary
  const { data: all } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, display_label, identity_fingerprint, interaction_count"
    )
    .eq("user_id", USER_ID);

  console.log("\n--- ALL PEOPLE ---");
  for (const p of all ?? []) {
    const keys = Object.keys(p.identity_fingerprint ?? {});
    console.log(
      `  ${p.display_label} (count=${p.interaction_count}) fingerprint keys: [${keys.join(", ")}]`
    );
  }
}

main().catch(console.error);
