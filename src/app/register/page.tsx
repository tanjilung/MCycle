"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setMessage(payload.error ?? "Registration failed");
      return;
    }

    setMessage("Account created. You can login now.");
    router.push("/login");
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-3xl bg-white/90 p-6 shadow-xl">
      <h1 className="text-2xl font-semibold">Create your MCycle account</h1>
      <p className="mt-2 text-sm text-zinc-700">Register with your name, email, and password.</p>

      <form className="mt-5 space-y-3" onSubmit={register}>
        <label className="block text-sm">
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <button type="submit" className="w-full rounded-full bg-black py-2 text-sm font-medium text-white">
          Register
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-zinc-700">{message}</p> : null}

      <p className="mt-4 text-sm text-zinc-700">
        Already have an account? <Link href="/login" className="font-medium underline">Login</Link>
      </p>
    </div>
  );
}
