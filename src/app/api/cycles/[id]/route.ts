import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { calculateCyclePrediction } from "@/lib/cycle/calculateCycle";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  menstruationStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const { id } = await context.params;
  const cycle = await prisma.cycleInstance.findFirst({
    where: { id, userId },
    include: { phases: true },
  });

  if (!cycle) {
    return fail("Cycle not found", 404);
  }

  return ok(cycle);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid cycle payload", 400);
  }

  const cycle = await prisma.cycleInstance.findFirst({ where: { id, userId } });
  if (!cycle) {
    return fail("Cycle not found", 404);
  }

  const nextStart = parsed.data.menstruationStartDate
    ? parseDateInput(parsed.data.menstruationStartDate)
    : cycle.menstruationStartDate;

  const prediction = calculateCyclePrediction(nextStart, {
    cycleLengthDays: cycle.cycleLengthDays,
    menstruationDays: cycle.menstruationDays,
    ovulationDays: cycle.ovulationDays,
    lutealDays: cycle.lutealDays,
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.phase.deleteMany({ where: { cycleInstanceId: id } });

    return tx.cycleInstance.update({
      where: { id },
      data: {
        menstruationStartDate: nextStart,
        notes: parsed.data.notes === undefined ? cycle.notes : parsed.data.notes,
        phases: {
          create: prediction.phases.map((phase) => ({
            phaseType: phase.phaseType,
            startDate: phase.startDate,
            endDate: phase.endDate,
          })),
        },
      },
      include: { phases: true },
    });
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CYCLE_UPDATED",
      metadata: {
        cycleId: id,
        menstruationStartDate: parsed.data.menstruationStartDate,
      },
    },
  });

  return ok(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const { id } = await context.params;
  const cycle = await prisma.cycleInstance.findFirst({ where: { id, userId } });
  if (!cycle) {
    return fail("Cycle not found", 404);
  }

  await prisma.cycleInstance.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CYCLE_UPDATED",
      metadata: { cycleId: id, deleted: true },
    },
  });

  return ok({ deleted: true });
}
