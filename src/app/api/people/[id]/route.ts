import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const person = await prisma.managedPerson.findFirst({
    where: { id, userId },
  });

  if (!person) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Prevent deleting the last person
  const count = await prisma.managedPerson.count({ where: { userId } });
  if (count <= 1) {
    return new NextResponse("Cannot delete the only person", { status: 400 });
  }

  await prisma.managedPerson.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
