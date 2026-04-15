import "dotenv/config";
import { prisma } from "../lib/prisma";
import { callSonnet, parseStructuredResponse } from "../lib/ai/anthropic";

interface ExtractedProfile {
  school: string | null;
  graduation_year: number | null;
  major: string | null;
  current_role: string | null;
  career_interests: string[];
  networking_goals: string | null;
  personal_interests: string[];
  skills: string[];
}

const SYSTEM = `You are a data extractor. Given a short free-text profile summary of a person, extract the structured fields below. Return ONLY valid JSON matching this exact shape — no markdown, no prose:

{
  "school": string | null,
  "graduation_year": number | null,
  "major": string | null,
  "current_role": string | null,
  "career_interests": string[],
  "networking_goals": string | null,
  "personal_interests": string[],
  "skills": string[]
}

Rules:
- Use null for unknown scalar fields, [] for unknown arrays.
- graduation_year must be a 4-digit integer or null.
- career_interests: industries, roles, or career paths (e.g. "Investment Banking", "Tech", "Startups").
- personal_interests: hobbies or life interests (e.g. "Golf", "Travel").
- skills: capabilities they offer (e.g. "Financial Modeling", "Public Speaking").
- current_role: their current position or status (e.g. "Senior at Ross", "Freshman at Michigan").
- networking_goals: a sentence describing what they want from their network, if mentioned.`;

async function main() {
  const all = await prisma.user.findMany({
    where: { profileSummary: { not: null } },
    select: { id: true, email: true, profileSummary: true, profileData: true },
  });
  const users = all.filter((u) => u.profileData == null);

  if (users.length === 0) {
    console.log("No users to backfill.");
    return;
  }

  console.log(`Backfilling ${users.length} user(s)...`);

  for (const u of users) {
    console.log(`\n→ ${u.email}`);
    console.log(`  summary: ${u.profileSummary?.slice(0, 100)}...`);

    try {
      const raw = await callSonnet(SYSTEM, `PROFILE SUMMARY:\n${u.profileSummary}`);
      const parsed = parseStructuredResponse<ExtractedProfile>(raw);

      if (!parsed) {
        console.log(`  ✗ Failed to parse structured output. Skipping.`);
        continue;
      }

      const profileData = {
        school: parsed.school ?? null,
        graduation_year: parsed.graduation_year ?? null,
        major: parsed.major ?? null,
        current_role: parsed.current_role ?? null,
        career_interests: Array.isArray(parsed.career_interests) ? parsed.career_interests : [],
        networking_goals: parsed.networking_goals ?? null,
        personal_interests: Array.isArray(parsed.personal_interests) ? parsed.personal_interests : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      };

      await prisma.user.update({
        where: { id: u.id },
        data: { profileData },
      });

      console.log(`  ✓ Saved:`, JSON.stringify(profileData));
    } catch (err) {
      console.error(`  ✗ Error:`, err);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
