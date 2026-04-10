import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = "b56afcb3-4f92-4e9a-9467-3105972f34dd";

async function main() {
  const { data: people } = await supabase
    .from("people")
    .select("id, first_name, last_name, display_label, identity_fingerprint, interaction_count, is_merged, merged_into_id")
    .eq("user_id", USER_ID);

  console.log(`Total people (including merged): ${people?.length}\n`);
  for (const p of people ?? []) {
    console.log(`${p.display_label} | merged=${p.is_merged} | merged_into=${p.merged_into_id ?? "null"} | count=${p.interaction_count}`);

    const { data: ips } = await supabase
      .from("interaction_people")
      .select("interaction_id, confidence")
      .eq("person_id", p.id);
    console.log(`  interaction_people links: ${ips?.length ?? 0}`);
    for (const ip of ips ?? []) {
      console.log(`    interaction=${ip.interaction_id} conf=${ip.confidence}`);
    }
  }
}
main().catch(console.error);
