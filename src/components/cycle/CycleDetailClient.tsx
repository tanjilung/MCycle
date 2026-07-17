"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhaseEditor } from "@/components/cycle/PhaseEditor";

type Phase = {
  id: string;
  phaseType: "MENSTRUATION" | "FOLLICULAR" | "OVULATION" | "LUTEAL";
  startDate: string;
  endDate: string;
  isEdited: boolean;
};

type Cycle = {
  id: string;
  menstruationStartDate: string;
  notes: string | null;
  phases: Phase[];
};

type Props = {
  initialCycle: Cycle;
};

export function CycleDetailClient({ initialCycle }: Props) {
  const router = useRouter();
  const [cycle, setCycle] = useState(initialCycle);
  const [notes, setNotes] = useState(initialCycle.notes ?? "");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteCycle() {
    if (!confirm("Delete this cycle and all its phases? This cannot be undone.")) return;
    setDeleting(true);
    const response = await fetch(`/api/cycles/${cycle.id}`, { method: "DELETE" });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "Could not delete cycle");
      setDeleting(false);
      return;
    }
    router.push("/app/dashboard");
  }

  async function refresh() {
    const response = await fetch(`/api/cycles/${cycle.id}`);
    const data = (await response.json()) as { ok: boolean; data: Cycle };
    if (response.ok && data.ok) {
      setCycle(data.data);
    }
  }

  async function saveNotes() {
    const response = await fetch(`/api/cycles/${cycle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "Unable to save notes");
      return;
    }

    setMessage("Notes saved");
    refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-4">
        <h2 className="text-lg font-semibold">Cycle Notes</h2>
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-black/15 p-3"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional details for this cycle"
        />
        <button
          type="button"
          onClick={saveNotes}
          className="mt-3 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Save notes
        </button>
        {message ? <p className="mt-2 text-sm text-zinc-700">{message}</p> : null}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Edit phase windows</h2>
        <PhaseEditor cycleId={cycle.id} phases={cycle.phases} onUpdated={refresh} />
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-red-600">Deleting this cycle will also remove all its phases.</p>
        <button
          type="button"
          onClick={deleteCycle}
          disabled={deleting}
          className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete cycle"}
        </button>
      </section>
    </div>
  );
}
