import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("testpassword123", 12);

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      passwordHash,
      fullName: "Test User",
      onboardingCompleted: true,
      profileSummary:
        "A senior at the University of Michigan Ross School of Business interested in investment banking and consulting. Active in the startup community and skilled in financial modeling and Python.",
    },
  });

  console.log(`Seeded test user: ${user.id} (${user.email})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
