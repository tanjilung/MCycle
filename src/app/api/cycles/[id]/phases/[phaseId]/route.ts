import { addDays, differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  applyMode: z.enum(["THIS_CYCLE", "FUTURE"]).default("THIS_CYCLE"),
  notes: z.string().max(2000).optional(),
});

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; phaseId: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const { id, phaseId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid phase payload", 400);
  }

  const startDate = parseDateInput(parsed.data.startDate);
  const endDate = parseDateInput(parsed.data.endDate);
  if (startDate > endDate) {
    return fail("Start date must be before end date", 400);
  }

  const cycle = await prisma.cycleInstance.findFirst({
    where: { id, userId },
    include: { phases: true },
  });

  if (!cycle) {
    return fail("Cycle not found", 404);
  }

  const phase = cycle.phases.find((item) => item.id === phaseId);
  if (!phase) {
    return fail("Phase not found", 404);
  }

  for (const other of cycle.phases) {
    if (other.id === phaseId) {
      continue;
    }

    if (rangesOverlap(startDate, endDate, other.startDate, other.endDate)) {
      return fail("Updated phase overlaps with another phase", 400);
    }
  }

  const dayShift = differenceInCalendarDays(startDate, phase.startDate);
  const duration = differenceInCalendarDays(endDate, startDate);

  await prisma.phase.update({
    where: { id: phaseId },
    data: {
      startDate,
      endDate,
      isEdited: true,
      notes: parsed.data.notes,
    },
  });

  if (parsed.data.applyMode === "FUTURE") {
    const futurePhases = await prisma.phase.findMany({
      where: {
        phaseType: phase.phaseType,
        cycleInstance: {
          userId,
          menstruationStartDate: {
            gt: cycle.menstruationStartDate,
          },
        },
      },
      include: {
        cycleInstance: {
          select: {
            menstruationStartDate: true,
          },
        },
      },
    });

    await Promise.all(
      futurePhases.map((item) => {
        const nextStart = addDays(item.startDate, dayShift);
        const nextEnd = addDays(nextStart, duration);

        return prisma.phase.update({
          where: { id: item.id },
          data: {
            startDate: nextStart,
            endDate: nextEnd,
            isEdited: true,
          },
        });
      }),
    );
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "PHASE_UPDATED",
      metadata: {
        cycleId: id,
        phaseId,
        applyMode: parsed.data.applyMode,
      },
    },
  });

  const updated = await prisma.cycleInstance.findUnique({
    where: { id },
    include: { phases: true },
  });

  return ok(updated);
}
