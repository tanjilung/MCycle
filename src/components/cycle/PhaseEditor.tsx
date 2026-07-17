"use client";

import { useState } from "react";
import { addDays } from "date-fns";

type PhaseType = "MENSTRUATION" | "FOLLICULAR" | "OVULATION" | "LUTEAL";

type Phase = {
  id: string;
  phaseType: PhaseType;
  startDate: string;
  endDate: string;
  isEdited: boolean;
};

type CycleDefaults = {
  cycleLengthDays: number;
  menstruationDays: number;
  ovulationDays: number;
  lutealDays: number;
};

type Props = {
  cycleId: string;
  phases: Phase[];
  cycleDefaults: CycleDefaults | null;
  onUpdated: () => void;
};

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

function addDaysToISO(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  return addDays(d, days).toISOString().slice(0, 10);
}

function recalcPhaseDates(
  menstruationStart: string,
  defaults: CycleDefaults,
): Record<PhaseType, { startDate: string; endDate: string }> {
  const { cycleLengthDays, menstruationDays, ovulationDays, lutealDays } = defaults;
  const ovulationStartOffset = cycleLengthDays - lutealDays - ovulationDays;
  const lutealStartOffset = cycleLengthDays - lutealDays;

  return {
    MENSTRUATION: {
      startDate: menstruationStart,
      endDate: addDaysToISO(menstruationStart, menstruationDays - 1),
    },
    FOLLICULAR: {
      startDate: addDaysToISO(menstruationStart, menstruationDays),
      endDate: addDaysToISO(menstruationStart, ovulationStartOffset - 1),
    },
    OVULATION: {
      startDate: addDaysToISO(menstruationStart, ovulationStartOffset),
      endDate: addDaysToISO(menstruationStart, ovulationStartOffset + ovulationDays - 1),
    },
    LUTEAL: {
      startDate: addDaysToISO(menstruationStart, lutealStartOffset),
      endDate: addDaysToISO(menstruationStart, cycleLengthDays - 1),
    },
  };
}

const PHASE_ORDER: PhaseType[] = ["MENSTRUATION", "FOLLICULAR", "OVULATION", "LUTEAL"];

export function PhaseEditor({ cycleId, phases, cycleDefaults, onUpdated }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [showOtherPhases, setShowOtherPhases] = useState(false);

  // Controlled date state per phase, keyed by phaseId
  const initialDates = Object.fromEntries(
    phases.map((p) => [
      p.id,
      { startDate: toDateInput(p.startDate), endDate: toDateInput(p.endDate) },
    ]),
  );
  const [dates, setDates] = useState<Record<string, { startDate: string; endDate: string }>>(initialDates);

  function handleMenstruationStartChange(phaseId: string, newStart: string) {
    if (!cycleDefaults || !newStart) {
      setDates((prev) => ({ ...prev, [phaseId]: { ...prev[phaseId], startDate: newStart } }));
      return;
    }

    // Recalculate all phases from the new menstruation start
    const recalc = recalcPhaseDates(newStart, cycleDefaults);
    const next = { ...dates };
    for (const phase of phases) {
      const calc = recalc[phase.phaseType];
      if (calc) {
        next[phase.id] = { startDate: calc.startDate, endDate: calc.endDate };
      }
    }
    setDates(next);
  }

  async function deletePhase(phaseId: string) {
    if (!confirm("Delete this phase? This cannot be undone.")) return;
    setDeletingId(phaseId);
    setMessage("");

    const response = await fetch(`/api/cycles/${cycleId}/phases/${phaseId}`, {
      method: "DELETE",
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "Could not delete phase");
      setDeletingId(null);
      return;
    }

    setMessage("Phase deleted");
    setDeletingId(null);
    onUpdated();
  }

  async function updatePhase(
    phaseId: string,
    startDate: string,
    endDate: string,
    applyMode: "THIS_CYCLE" | "FUTURE",
  ) {
    setLoadingId(phaseId);
    setMessage("");

    const response = await fetch(`/api/cycles/${cycleId}/phases/${phaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, applyMode }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "Could not update phase");
      setLoadingId(null);
      return;
    }

    setMessage("Phase updated");
    setLoadingId(null);
    onUpdated();
  }

  const sorted = PHASE_ORDER.map((type) => phases.find((p) => p.phaseType === type)).filter(Boolean) as Phase[];
  const menstruation = sorted.find((p) => p.phaseType === "MENSTRUATION");
  const others = sorted.filter((p) => p.phaseType !== "MENSTRUATION");

  function renderPhase(phase: Phase) {
    const d = dates[phase.id] ?? { startDate: toDateInput(phase.startDate), endDate: toDateInput(phase.endDate) };
    const isMenstruation = phase.phaseType === "MENSTRUATION";

    return (
      <form
        key={phase.id}
        className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const applyMode = (new FormData(event.currentTarget).get("applyMode") ?? "THIS_CYCLE") as
            | "THIS_CYCLE"
            | "FUTURE";
          updatePhase(phase.id, d.startDate, d.endDate, applyMode);
        }}
      >
        <div>
          <p className="text-sm font-semibold">{phase.phaseType}</p>
          <p className="text-xs text-zinc-600">{phase.isEdited ? "manually edited" : "auto calculated"}</p>
        </div>

        <label className="text-sm">
          Start
          <input
            name="startDate"
            type="date"
            value={d.startDate}
            onChange={(e) => {
              if (isMenstruation) {
                handleMenstruationStartChange(phase.id, e.target.value);
              } else {
                setDates((prev) => ({ ...prev, [phase.id]: { ...prev[phase.id], startDate: e.target.value } }));
              }
            }}
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          End
          <input
            name="endDate"
            type="date"
            value={d.endDate}
            onChange={(e) =>
              setDates((prev) => ({ ...prev, [phase.id]: { ...prev[phase.id], endDate: e.target.value } }))
            }
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <div className="flex items-end gap-2">
          <select
            name="applyMode"
            className="rounded-xl border border-black/15 px-3 py-2 text-sm"
            defaultValue="THIS_CYCLE"
          >
            <option value="THIS_CYCLE">This cycle</option>
            <option value="FUTURE">Future cycles</option>
          </select>
          <button
            type="submit"
            disabled={loadingId === phase.id}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
          >
            {loadingId === phase.id ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => deletePhase(phase.id)}
            disabled={deletingId === phase.id}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {deletingId === phase.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {menstruation ? renderPhase(menstruation) : null}

      {others.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setShowOtherPhases((v) => !v)}
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline"
          >
            {showOtherPhases ? "Hide other phases ▲" : "Show other phases ▼"}
          </button>

          {showOtherPhases ? (
            <div className="space-y-3">
              {others.map((phase) => renderPhase(phase))}
            </div>
          ) : null}
        </>
      ) : null}

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
}
