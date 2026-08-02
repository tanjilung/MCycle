"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; name: string; createdAt: string };

export default function SettingsPage() {
  const [tab, setTab] = useState<"people" | "data">("people");
  const [message, setMessage] = useState("");
  const [exportData, setExportData] = useState<string>("");
  const [people, setPeople] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((data: Person[]) => {
        setPeople(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const updated = await fetch("/api/people").then((r) => r.json());
      setPeople(updated as Person[]);
      setNewName("");
      setMessage("Person added");
      setTimeout(() => setMessage(""), 2000);
    }
  }

  async function removePerson(id: string) {
    if (!confirm("Remove this person from tracking?")) return;
    const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
    if (res.ok) {
      const updated = await fetch("/api/people").then((r) => r.json());
      setPeople(updated as Person[]);
      router.refresh();
      setMessage("Person removed");
      setTimeout(() => setMessage(""), 2000);
    } else {
      const err = await res.text();
      setMessage(err || "Failed to remove");
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function exportAccountData() {
    const response = await fetch("/api/user/export", { method: "POST" });
    const payload = (await response.json()) as { ok: boolean; data?: unknown; error?: string };

    if (!response.ok || !payload.ok) {
      setMessage(payload.error ?? "Export failed");
      return;
    }

    setExportData(JSON.stringify(payload.data, null, 2));
    setMessage("Data exported below as JSON");
  }

  async function deleteAccount() {
    const accepted = window.confirm(
      "Delete your account and all cycle data? This cannot be undone.",
    );

    if (!accepted) return;

    const response = await fetch("/api/user/delete", { method: "POST" });
    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !payload.ok) {
      setMessage(payload.error ?? "Account deletion failed");
      return;
    }

    router.push("/register");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setTab("people")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            tab === "people"
              ? "bg-white border-t-2 border-t-sky-500 text-sky-600"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          People
        </button>
        <button
          onClick={() => setTab("data")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            tab === "data"
              ? "bg-white border-t-2 border-t-sky-500 text-sky-600"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Data Rights
        </button>
      </div>

      {message ? (
        <div className="rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-800">
          {message}
        </div>
      ) : null}

      {tab === "people" && (
        <section className="rounded-3xl bg-white/90 p-5 shadow-lg space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Tracked People</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Add people whose cycles you want to track. Each person gets their own cycle data.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-400">Loading...</p>
          ) : (
            <>
              {/* Add form */}
              <form onSubmit={addPerson} className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Person name"
                  maxLength={100}
                  required
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  Add Person
                </button>
              </form>

              {/* People list */}
              <div className="space-y-2">
                {people.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">No people tracked yet</p>
                ) : (
                  people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{person.name}</p>
                        <p className="text-xs text-zinc-400">
                          Added {new Date(person.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removePerson(person.id)}
                        disabled={people.length <= 1}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-30 disabled:hover:bg-zinc-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      )}

      {tab === "data" && (
        <section className="rounded-3xl bg-white/90 p-5 shadow-lg space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Data Rights</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Export your account data or permanently delete your account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportAccountData}
              className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Export Data
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>

          {exportData ? (
            <section className="rounded-3xl bg-zinc-950 p-4 text-xs text-zinc-100 shadow-lg">
              <pre className="overflow-auto max-h-64">{exportData}</pre>
            </section>
          ) : null}
        </section>
      )}
    </div>
  );
}
