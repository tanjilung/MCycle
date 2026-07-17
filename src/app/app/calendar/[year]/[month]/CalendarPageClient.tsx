"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { MonthlyCycleCalendar } from "@/components/calendar/MonthlyCycleCalendar";

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

type CyclesResponse = {
  ok: boolean;
  data?: {
    cycles: Cycle[];
    prediction: Prediction;
  };
  error?: string;
};

type Props = {
  year: string;
  month: string;
};

export function CalendarPageClient({ year, month }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const monthDate = useMemo(() => parse(`${year}-${month}`, "yyyy-MM", new Date()), [month, year]);

  const loadData = useCallback(async () => {
    const response = await fetch(`/api/cycles?month=${year}-${month}`);
    const data = (await response.json()) as CyclesResponse;

    if (!response.ok || !data.ok || !data.data) {
      setError(data.error ?? "Could not load cycle data");
      setLoading(false);
      return;
    }

    setCycles(data.data.cycles);
    setPrediction(data.data.prediction);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    let active = true;

    (async () => {
      const response = await fetch(`/api/cycles?month=${year}-${month}`);
      const data = (await response.json()) as CyclesResponse;

      if (!active) {
        return;
      }

      if (!response.ok || !data.ok || !data.data) {
        setError(data.error ?? "Could not load cycle data");
        setLoading(false);
        return;
      }

      setError("");
      setCycles(data.data.cycles);
      setPrediction(data.data.prediction);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [month, year]);

  async function onSetStartDate(dateISO: string) {
    const response = await fetch("/api/cycles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ menstruationStartDate: dateISO }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? "Failed to create cycle");
    }

    await loadData();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Monthly Calendar</h2>
        <p className="text-zinc-700">
          Select menstruation start day in {format(monthDate, "MMMM yyyy")} to refresh next ovulation (orange) and next menstruation (red).
        </p>
      </div>

      {loading ? <p className="text-zinc-600">Loading calendar...</p> : null}
      {error ? <p className="rounded-xl bg-red-100 p-3 text-red-800">{error}</p> : null}

      {!loading ? (
        <MonthlyCycleCalendar
          monthDate={monthDate}
          cycles={cycles}
          prediction={prediction}
          onSetStartDate={onSetStartDate}
        />
      ) : null}

      <section className="space-y-3 rounded-3xl bg-white/85 p-4 shadow-lg">
        <h3 className="text-lg font-semibold">Cycle history</h3>
        {cycles.length === 0 ? (
          <p className="text-zinc-600">No cycles yet. Pick a start date above.</p>
        ) : (
          <ul className="space-y-2">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="flex items-center justify-between rounded-xl border border-black/10 p-3">
                <span className="text-sm text-zinc-700">Start: {cycle.menstruationStartDate.slice(0, 10)}</span>
                <Link href={`/app/cycles/${cycle.id}`} className="text-sm font-medium text-black underline-offset-2 hover:underline">
                  Edit phases
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
