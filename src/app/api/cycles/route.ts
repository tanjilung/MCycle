import { endOfMonth, format, parse, startOfMonth } from "date-fns";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { getCurrentUserId } from "@/lib/auth/session";
import { calculateCyclePrediction } from "@/lib/cycle/calculateCycle";
import { parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  menstruationStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
});

function getMonthRange(monthQuery?: string | null) {
  const month = monthQuery && /^\d{4}-\d{2}$/.test(monthQuery)
    ? parse(monthQuery, "yyyy-MM", new Date())
    : new Date();

  return {
    month: format(month, "yyyy-MM"),
    start: startOfMonth(month),
    end: endOfMonth(month),
  };
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const { month } = getMonthRange(searchParams.get("month"));

  const cycles = await prisma.cycleInstance.findMany({
    where: {
      userId,
    },
    include: {
      phases: true,
    },
    orderBy: {
      menstruationStartDate: "desc",
    },
  });

  const latest = cycles[0];
  const defaults = await prisma.cycleDefaults.findUnique({ where: { userId } });

  const prediction = latest && defaults
    ? calculateCyclePrediction(latest.menstruationStartDate, {
        cycleLengthDays: defaults.cycleLengthDays,
        menstruationDays: defaults.menstruationDays,
        ovulationDays: defaults.ovulationDays,
        lutealDays: defaults.lutealDays,
      })
    : null;

  return ok({
    month,
    cycles,
    prediction,
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid cycle payload", 400);
  }

  const defaults = await prisma.cycleDefaults.findUnique({ where: { userId } });
  if (!defaults) {
    return fail("Cycle defaults are missing", 404);
  }

  if (
    defaults.menstruationDays + defaults.ovulationDays + defaults.lutealDays >=
    defaults.cycleLengthDays
  ) {
    return fail("Defaults are invalid. Adjust phase lengths first", 400);
  }

  const menstruationStartDate = parseDateInput(parsed.data.menstruationStartDate);

  const prediction = calculateCyclePrediction(menstruationStartDate, {
    cycleLengthDays: defaults.cycleLengthDays,
    menstruationDays: defaults.menstruationDays,
    ovulationDays: defaults.ovulationDays,
    lutealDays: defaults.lutealDays,
  });

  const created = await prisma.cycleInstance.create({
    data: {
      userId,
      menstruationStartDate,
      cycleLengthDays: defaults.cycleLengthDays,
      menstruationDays: defaults.menstruationDays,
      ovulationDays: defaults.ovulationDays,
      lutealDays: defaults.lutealDays,
      notes: parsed.data.notes,
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

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CYCLE_CREATED",
      metadata: {
        cycleId: created.id,
        menstruationStartDate: parsed.data.menstruationStartDate,
      },
    },
  });

  return ok(created, { status: 201 });
}
