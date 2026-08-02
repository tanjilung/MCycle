import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  cycleLengthDays: z.number().int().min(15).max(60),
  menstruationDays: z.number().int().min(1).max(15),
  ovulationDays: z.number().int().min(1).max(5),
  lutealDays: z.number().int().min(7).max(20),
});

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const managedPersonId = searchParams.get("managedPersonId");
  if (!managedPersonId) {
    return fail("managedPersonId is required", 400);
  }

  const defaults = await prisma.cycleDefaults.findUnique({ where: { managedPersonId } });
  if (!defaults) {
    return fail("Defaults not found", 404);
  }

  return ok(defaults);
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid defaults payload", 400);
  }

  const { managedPersonId, cycleLengthDays, menstruationDays, ovulationDays, lutealDays } = body;
  if (!managedPersonId) {
    return fail("managedPersonId is required", 400);
  }

  if (menstruationDays + ovulationDays + lutealDays >= cycleLengthDays) {
    return fail("Phase durations exceed cycle length", 400);
  }

  const defaults = await prisma.cycleDefaults.update({
    where: { managedPersonId },
    data: { cycleLengthDays, menstruationDays, ovulationDays, lutealDays },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CYCLE_DEFAULTS_UPDATED",
      metadata: {
        managedPersonId,
        cycleLengthDays,
        menstruationDays,
        ovulationDays,
        lutealDays,
      },
    },
  });

  return ok(defaults);
}
