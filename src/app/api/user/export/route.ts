import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const payload = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      cycleDefaults: true,
      passkeys: {
        select: {
          id: true,
          deviceName: true,
          createdAt: true,
          lastUsedAt: true,
        },
      },
      cycles: {
        include: {
          phases: true,
        },
        orderBy: {
          menstruationStartDate: "desc",
        },
      },
    },
  });

  if (!payload) {
    return fail("User not found", 404);
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "DATA_EXPORTED",
      metadata: {
        exportedCycles: payload.cycles.length,
      },
    },
  });

  return ok(payload);
}
