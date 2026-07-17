import { notFound } from "next/navigation";
import { CycleDetailClient } from "@/components/cycle/CycleDetailClient";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CycleDetailPage({ params }: Props) {
  const userId = await getCurrentUserId();
  if (!userId) {
    notFound();
  }

  const { id } = await params;

  const [cycle, defaults] = await Promise.all([
    prisma.cycleInstance.findFirst({
      where: { id, userId },
      include: { phases: true },
    }),
    prisma.cycleDefaults.findUnique({ where: { userId } }),
  ]);

  if (!cycle) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Cycle Detail</h2>
      <p className="text-zinc-700">Start date: {cycle.menstruationStartDate.toISOString().slice(0, 10)}</p>
      <CycleDetailClient
        initialCycle={{
          id: cycle.id,
          menstruationStartDate: cycle.menstruationStartDate.toISOString(),
          notes: cycle.notes,
          phases: cycle.phases.map((phase) => ({
            id: phase.id,
            phaseType: phase.phaseType,
            startDate: phase.startDate.toISOString(),
            endDate: phase.endDate.toISOString(),
            isEdited: phase.isEdited,
          })),
        }}
        cycleDefaults={defaults ? {
          cycleLengthDays: defaults.cycleLengthDays,
          menstruationDays: defaults.menstruationDays,
          ovulationDays: defaults.ovulationDays,
          lutealDays: defaults.lutealDays,
        } : null}
      />
    </div>
  );
}
