"use client";

import { useEffect, useState } from "react";

type Person = { id: string; name: string };

const STORAGE_KEY = "mcycle:selected_managed_person_id";

export function ManagedPersonSwitcher({
  currentId,
  onChange,
  hideRemove = false,
}: {
  currentId: string | null;
  onChange: (id: string) => void;
  hideRemove?: boolean;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/people")
      .then((res) => res.json())
      .then((data: Person[]) => {
        if (cancelled) return;
        setPeople(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Persist selected ID to localStorage whenever currentId changes
    if (currentId) {
      localStorage.setItem(STORAGE_KEY, currentId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    if (!newId) return;
    setSwitching(true);
    onChange(newId);
    // Clear switching state after a brief delay so user sees feedback
    setTimeout(() => setSwitching(false), 800);
  };

  async function handleDelete(id: string) {
    if (!confirm("Remove this person from tracking?")) return;
    await fetch(`/api/people/${id}`, { method: "DELETE" });
    // Refresh list
    const res = await fetch("/api/people");
    const data = await res.json() as Person[];
    setPeople(data);
    if (currentId === id) {
      onChange(data[0]?.id ?? "");
    }
  }

  if (loading) return <span className="text-xs text-zinc-400">Loading...</span>;
  if (people.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {switching && (
        <span className="text-xs text-sky-600 animate-pulse">Switching...</span>
      )}
      <select
        value={currentId ?? ""}
        onChange={handleChange}
        disabled={switching}
        className="rounded-lg border border-zinc-300 p-2 text-sm"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {!hideRemove && people.length > 1 && currentId ? (
        <button
          type="button"
          onClick={() => handleDelete(currentId)}
          disabled={switching}
          className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
