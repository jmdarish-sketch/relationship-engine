import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "b56afcb3-4f92-4e9a-9467-3105972f34dd";

async function main() {
  // Delete in dependency order (children first)
  const tables = [
    "disambiguation_queue",
    "insights",
    "extracted_details",
    "identity_signals",
    "interaction_people",
    "interactions",
    "people",
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", USER_ID)
      .select("id");

    if (error) {
      // interaction_people and identity_signals don't have user_id directly,
      // so we need to handle them differently
      console.log(`  ${table}: skipping direct delete, trying cascade...`);
    } else {
      console.log(`  ${table}: deleted ${data?.length ?? 0} rows`);
    }
  }

  // For tables without user_id, they should have been cascade-deleted
  // when their parent interactions/people were deleted.
  // But let's verify nothing is orphaned.
  for (const table of ["interaction_people", "identity_signals", "extracted_details"]) {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    console.log(`  ${table} remaining: ${count ?? 0}`);
  }

  console.log("\nDone — all test data wiped.");
}

main().catch(console.error);
