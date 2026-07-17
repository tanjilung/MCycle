"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [message, setMessage] = useState("");
  const [exportData, setExportData] = useState<string>("");
  const router = useRouter();

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

    if (!accepted) {
      return;
    }

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
      <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
        <h2 className="text-xl font-semibold">Data Rights</h2>
        <p className="mt-2 text-zinc-700">Export your account data or permanently delete your account.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportAccountData}
            className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium"
          >
            Export Data
          </button>
          <button
            type="button"
            onClick={deleteAccount}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Delete Account
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}
      </section>

      {exportData ? (
        <section className="rounded-3xl bg-zinc-950 p-4 text-xs text-zinc-100 shadow-lg">
          <pre className="overflow-auto">{exportData}</pre>
        </section>
      ) : null}
    </div>
  );
}
