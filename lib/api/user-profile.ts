import { prisma } from "@/lib/prisma";

/**
 * Fetches user profile fields needed for prompt context.
 */
export async function fetchUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      profileSummary: true,
    },
  });
}
