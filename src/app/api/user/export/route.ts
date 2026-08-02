import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  // Query via managedPeople since User doesn't have direct cycleDefaults/cycles relations.
  const payload = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      managedPeople: {
        include: {
          cycleDefaults: true,
          cycles: {
            include: {
              phases: true,
            },
            orderBy: {
              menstruationStartDate: "desc",
            },
          },
        },
      },
    },
  });

  if (!payload) {
    return fail("User not found", 404);
  }

  // Flatten cycles across all managed people for the export payload
  const flattened = {
    ...payload,
    cycleDefaults: payload.managedPeople[0]?.cycleDefaults ?? null,
    cycles: payload.managedPeople.flatMap((mp) => mp.cycles),
  };

  await prisma.auditLog.create({
    data: {
      userId,
      action: "DATA_EXPORTED",
      metadata: {
        exportedCycles: flattened.cycles.length,
      },
    },
  });

  return ok(flattened);
}
