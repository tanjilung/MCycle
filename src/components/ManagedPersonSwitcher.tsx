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

  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then(setPeople);
  }, []);

  if (people.length === 0) return null;

  return (
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
  );
}
