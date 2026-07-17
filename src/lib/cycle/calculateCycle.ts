import { addDays, differenceInCalendarDays } from "date-fns";

export type CycleDefaults = {
  cycleLengthDays: number;
  menstruationDays: number;
  ovulationDays: number;
  lutealDays: number;
};

export type PhaseWindow = {
  phaseType: "MENSTRUATION" | "FOLLICULAR" | "OVULATION" | "LUTEAL";
  startDate: Date;
  endDate: Date;
};

export type CyclePrediction = {
  phases: PhaseWindow[];
  nextOvulation: Date;
  nextMenstruation: Date;
};

export function calculateCyclePrediction(
  menstruationStartDate: Date,
  defaults: CycleDefaults,
): CyclePrediction {
  const { cycleLengthDays, menstruationDays, ovulationDays, lutealDays } = defaults;

  if (cycleLengthDays < 15 || cycleLengthDays > 60) {
    throw new Error("Cycle length is out of supported range");
  }

  const ovulationStartOffset = cycleLengthDays - lutealDays - ovulationDays;
  const lutealStartOffset = cycleLengthDays - lutealDays;

  const menstruationStart = startOfDayUtc(menstruationStartDate);
  const menstruationEnd = addDays(menstruationStart, menstruationDays - 1);
  const follicularStart = addDays(menstruationEnd, 1);
  const follicularEnd = addDays(menstruationStart, ovulationStartOffset - 1);
  const ovulationStart = addDays(menstruationStart, ovulationStartOffset);
  const ovulationEnd = addDays(ovulationStart, ovulationDays - 1);
  const lutealStart = addDays(menstruationStart, lutealStartOffset);
  const lutealEnd = addDays(menstruationStart, cycleLengthDays - 1);

  const phases: PhaseWindow[] = [
    { phaseType: "MENSTRUATION", startDate: menstruationStart, endDate: menstruationEnd },
    { phaseType: "FOLLICULAR", startDate: follicularStart, endDate: follicularEnd },
    { phaseType: "OVULATION", startDate: ovulationStart, endDate: ovulationEnd },
    { phaseType: "LUTEAL", startDate: lutealStart, endDate: lutealEnd },
  ];

  return {
    phases,
    nextOvulation: ovulationStart,
    nextMenstruation: addDays(menstruationStart, cycleLengthDays),
  };
}

export function validatePhaseSequence(phases: PhaseWindow[]): void {
  const sorted = [...phases].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  for (let i = 0; i < sorted.length; i += 1) {
    const phase = sorted[i];
    if (phase.startDate.getTime() > phase.endDate.getTime()) {
      throw new Error(`Invalid range for ${phase.phaseType}`);
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      const gap = differenceInCalendarDays(phase.startDate, prev.endDate);
      if (gap < 1) {
        throw new Error("Phase ranges overlap or are out of order");
      }
    }
  }
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
