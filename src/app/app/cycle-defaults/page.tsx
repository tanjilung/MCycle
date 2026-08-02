"use client";

import { FormEvent, useEffect, useState } from "react";
import { useManagedPerson } from "../ManagedPersonProvider";

type Defaults = {
  cycleLengthDays: number;
  menstruationDays: number;
  ovulationDays: number;
  lutealDays: number;
  managedPersonId: string;
};

const initialDefaults: Defaults = {
  cycleLengthDays: 28,
  menstruationDays: 5,
  ovulationDays: 1,
  lutealDays: 14,
  managedPersonId: "",
};

export default function CycleDefaultsPage() {
  const { currentId, setCurrentId } = useManagedPerson();
  const [defaults, setDefaults] = useState<Defaults>(initialDefaults);
  const [message, setMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/people")
      .then((res) => res.json())
      .then((data: { id: string; name: string }[]) => {
        if (cancelled) return;
        setPeople(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let active = true;

    if (!currentId) {
      if (active) setMessage("Select a person in Settings first");
      return;
    }

    (async () => {
      const response = await fetch(`/api/cycle-defaults?managedPersonId=${encodeURIComponent(currentId)}`);
      const payload = (await response.json()) as {
        ok: boolean;
        data?: Defaults;
        error?: string;
      };

      if (!active) {
        return;
      }

      if (response.ok && payload.ok && payload.data) {
        setDefaults(payload.data);
        setMessage("");
        return;
      }

      // If no defaults exist yet for this person, create them via PATCH (create-or-update)
      if (response.status === 404) {
        const createResp = await fetch("/api/cycle-defaults", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managedPersonId: currentId,
            cycleLengthDays: 28,
            menstruationDays: 5,
            ovulationDays: 1,
            lutealDays: 14,
          }),
        });
        const createPayload = (await createResp.json()) as { ok: boolean; data?: Defaults };
        if (createResp.ok && createPayload.ok && createPayload.data) {
          setDefaults(createPayload.data);
          return;
        }
      }

      setMessage(payload.error ?? "Unable to load defaults");
    })();

    return () => {
      active = false;
    };
  }, [currentId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentId) {
      setMessage("Select a person first");
      return;
    }

    const response = await fetch(`/api/cycle-defaults?managedPersonId=${encodeURIComponent(currentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...defaults, managedPersonId: currentId }),
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setMessage(payload.error ?? "Could not save defaults");
      return;
    }

    setMessage("Defaults saved");
  }

  const follicularDays =
    defaults.cycleLengthDays -
    defaults.menstruationDays -
    defaults.ovulationDays -
    defaults.lutealDays;

  return (
    <div className="max-w-2xl space-y-4 rounded-3xl bg-white/90 p-5 shadow-lg">
      <h2 className="text-2xl font-semibold">Cycle Defaults</h2>
      <p className="text-zinc-700">
        Configure your base cycle. Follicular days are derived from the remaining days in the cycle.
      </p>

      {people.length > 0 && (
        <label className="text-sm">
          Managed person
          <select
            value={currentId ?? ""}
            onChange={(e) => setCurrentId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="text-sm">
          Cycle length (days)
          <input
            type="number"
            min={15}
            max={60}
            value={defaults.cycleLengthDays}
            onChange={(event) =>
              setDefaults((prev) => ({ ...prev, cycleLengthDays: Number(event.target.value) }))
            }
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Menstruation days
          <input
            type="number"
            min={1}
            max={15}
            value={defaults.menstruationDays}
            onChange={(event) =>
              setDefaults((prev) => ({ ...prev, menstruationDays: Number(event.target.value) }))
            }
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm font-medium text-zinc-500 underline-offset-2 hover:underline text-left"
        >
          {showAdvanced ? "Hide advanced settings ▲" : "Show advanced settings ▼"}
        </button>

        {showAdvanced ? (
          <>
            <label className="text-sm">
              Ovulation days
              <input
                type="number"
                min={1}
                max={5}
                value={defaults.ovulationDays}
                onChange={(event) =>
                  setDefaults((prev) => ({ ...prev, ovulationDays: Number(event.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
              />
            </label>

            <label className="text-sm">
              Luteal days
              <input
                type="number"
                min={7}
                max={20}
                value={defaults.lutealDays}
                onChange={(event) =>
                  setDefaults((prev) => ({ ...prev, lutealDays: Number(event.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
              />
            </label>

            <p className="rounded-xl bg-zinc-100 p-3 text-sm">
              Follicular phase (calculated): <strong>{follicularDays}</strong> days
            </p>
          </>
        ) : null}

        <button
          type="submit"
          className="w-fit rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
        >
          Save defaults
        </button>
      </form>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
}
