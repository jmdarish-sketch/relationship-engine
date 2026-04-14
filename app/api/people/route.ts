import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireUserId } from "@/lib/api/auth";
import { ok, badRequest, unauthorized } from "@/lib/api/response";
import { buildFingerprint, buildDisplayName } from "@/lib/api/fingerprint";

// GET /api/people
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") ?? undefined;
  const sort = params.get("sort") ?? "recent";
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);
  const offset = parseInt(params.get("offset") ?? "0");

  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { displayName: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employer: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "name"
      ? { displayName: "asc" as const }
      : { updatedAt: "desc" as const };

  const [people, total] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        _count: { select: { interactionPeople: true } },
      },
    }),
    prisma.person.count({ where }),
  ]);

  return ok(people, { total, limit, offset });
}

// POST /api/people
const createSchema = z.object({
  display_name: z.string().min(1).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  employer: z.string().optional(),
  user_current_role: z.string().optional(),
  school: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten());
  }

  const d = parsed.data;
  const displayName =
    d.display_name ??
    buildDisplayName({
      firstName: d.first_name,
      lastName: d.last_name,
      employer: d.employer,
      school: d.school,
    });

  const fingerprint = buildFingerprint({
    firstName: d.first_name,
    lastName: d.last_name,
    employer: d.employer,
    userCurrentRole: d.user_current_role,
    school: d.school,
    email: d.email,
  });

  const person = await prisma.person.create({
    data: {
      userId,
      displayName,
      firstName: d.first_name ?? null,
      lastName: d.last_name ?? null,
      employer: d.employer ?? null,
      userCurrentRole: d.user_current_role ?? null,
      school: d.school ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
      linkedinUrl: d.linkedin_url ?? null,
      notes: d.notes ?? null,
      fingerprint: Object.keys(fingerprint).length > 0 ? fingerprint : Prisma.DbNull,
    },
    include: {
      _count: { select: { interactionPeople: true } },
    },
  });

  return ok(person);
}
