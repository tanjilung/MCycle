"use client";

import { useEffect, useState } from "react";

type Person = { id: string; name: string };

export function ManagedPersonSwitcher({
  currentId,
  onChange,
}: {
  currentId: string | null;
  onChange: (id: string) => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/people")
      .then((res) => res.json())
      .then((data: Person[]) => {
        if (cancelled) return;
        setPeople(data);
        if (!currentId && data[0]) onChange(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

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
      <select
        value={currentId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 p-2 text-sm"
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {people.length > 1 && currentId ? (
        <button
          type="button"
          onClick={() => handleDelete(currentId)}
          className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-600 hover:bg-red-200"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
