"use client";

import { useState } from "react";

type Phase = {
  id: string;
  phaseType: "MENSTRUATION" | "FOLLICULAR" | "OVULATION" | "LUTEAL";
  startDate: string;
  endDate: string;
  isEdited: boolean;
};

type Props = {
  cycleId: string;
  phases: Phase[];
  onUpdated: () => void;
};

function dateInputValue(value: string): string {
  return value.slice(0, 10);
}

export function PhaseEditor({ cycleId, phases, onUpdated }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

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

  return (
    <div className="space-y-3">
      {phases.map((phase) => (
        <form
          key={phase.id}
          className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const startDate = String(formData.get("startDate") ?? "");
            const endDate = String(formData.get("endDate") ?? "");
            const applyMode = String(formData.get("applyMode") ?? "THIS_CYCLE") as
              | "THIS_CYCLE"
              | "FUTURE";

            updatePhase(phase.id, startDate, endDate, applyMode);
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
              defaultValue={dateInputValue(phase.startDate)}
              className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
            />
          </label>

          <label className="text-sm">
            End
            <input
              name="endDate"
              type="date"
              defaultValue={dateInputValue(phase.endDate)}
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
          </div>
        </form>
      ))}

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
}
