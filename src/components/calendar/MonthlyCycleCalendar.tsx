"use client";

import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";

type Phase = {
  id: string;
  phaseType: "MENSTRUATION" | "FOLLICULAR" | "OVULATION" | "LUTEAL";
  startDate: string;
  endDate: string;
};

type Cycle = {
  id: string;
  menstruationStartDate: string;
  phases: Phase[];
};

type Prediction = {
  nextOvulation: string;
  nextMenstruation: string;
} | null;

type Props = {
  monthDate: Date;
  cycles: Cycle[];
  prediction: Prediction;
  onSetStartDate: (dateISO: string) => Promise<void>;
};

function normalize(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return format(date, "yyyy-MM-dd");
}

export function MonthlyCycleCalendar({
  monthDate,
  cycles,
  prediction,
  onSetStartDate,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const menstruationDates = useMemo(() => {
    const set = new Set<string>();

    cycles.forEach((cycle) => {
      cycle.phases
        .filter((phase) => phase.phaseType === "MENSTRUATION")
        .forEach((phase) => {
          const phaseDays = eachDayOfInterval({
            start: new Date(phase.startDate),
            end: new Date(phase.endDate),
          });
          phaseDays.forEach((day) => set.add(normalize(day)));
        });
    });

    return set;
  }, [cycles]);

  const nextOvulation = prediction ? normalize(prediction.nextOvulation) : null;
  const nextMenstruation = prediction ? normalize(prediction.nextMenstruation) : null;

  async function submitStartDate() {
    if (!selectedDate) {
      return;
    }

    setSubmitting(true);
    try {
      await onSetStartDate(selectedDate);
    } finally {
      setSubmitting(false);
    }
  }

  const prevMonth = addMonths(monthDate, -1);
  const nextMonth = addMonths(monthDate, 1);

  return (
    <div className="space-y-4 rounded-3xl bg-white/85 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <a
          href={`/app/calendar/${format(prevMonth, "yyyy")}/${format(prevMonth, "MM")}`}
          className="rounded-full border border-black/10 px-3 py-1 text-sm hover:bg-zinc-100"
        >
          Prev
        </a>
        <h2 className="text-xl font-semibold text-zinc-900">{format(monthDate, "MMMM yyyy")}</h2>
        <a
          href={`/app/calendar/${format(nextMonth, "yyyy")}/${format(nextMonth, "MM")}`}
          className="rounded-full border border-black/10 px-3 py-1 text-sm hover:bg-zinc-100"
        >
          Next
        </a>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-zinc-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dow) => (
          <span key={dow}>{dow}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
          <div key={`blank-${idx}`} className="h-20 rounded-xl bg-zinc-100/60" />
        ))}

        {days.map((day) => {
          const dayISO = normalize(day);
          const isMenstruation = menstruationDates.has(dayISO);
          const isNextOvulation = nextOvulation === dayISO;
          const isNextMenstruation = nextMenstruation === dayISO;
          const isSelected = selectedDate === dayISO;

          let colorClass = "bg-white border-zinc-200";
          if (isMenstruation) {
            colorClass = "bg-rose-100 border-rose-300";
          }
          if (isNextOvulation) {
            colorClass = "bg-orange-200 border-orange-400";
          }
          if (isNextMenstruation) {
            colorClass = "bg-red-300 border-red-500 text-white";
          }

          return (
            <button
              key={dayISO}
              type="button"
              onClick={() => setSelectedDate(dayISO)}
              className={`h-20 rounded-xl border p-2 text-left transition hover:shadow-md ${colorClass} ${
                isSelected ? "ring-2 ring-black" : ""
              }`}
            >
              <span className="text-sm font-medium">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 p-3">
        <div className="text-sm text-zinc-700">
          Selected menstruation start: <span className="font-semibold">{selectedDate ?? "None"}</span>
        </div>
        <button
          type="button"
          onClick={submitStartDate}
          disabled={!selectedDate || submitting}
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Set menstruation start"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-300" />Menstruation</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-300" />Next Ovulation</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-400" />Next Menstruation</span>
      </div>
    </div>
  );
}
