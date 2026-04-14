import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api/auth";
import { ok, notFound, unauthorized } from "@/lib/api/response";

// DELETE /api/extracted-details/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const detail = await prisma.extractedDetail.findFirst({
    where: { id, interaction: { userId } },
  });
  if (!detail) return notFound("Detail not found");

  await prisma.extractedDetail.delete({ where: { id } });

  return ok({ deleted: true });
}
