"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function passwordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setMessage(payload.error ?? "Login failed");
      return;
    }

    router.push("/app/dashboard");
    router.refresh();
  }

  async function passkeyLogin() {
    setMessage("");

    try {
      const optionsResponse = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const optionsPayload = (await optionsResponse.json()) as {
        ok: boolean;
        data?: Parameters<typeof startAuthentication>[0]["optionsJSON"];
        error?: string;
      };

      if (!optionsResponse.ok || !optionsPayload.ok || !optionsPayload.data) {
        setMessage(optionsPayload.error ?? "Unable to get passkey options");
        return;
      }

      const credential = await startAuthentication({ optionsJSON: optionsPayload.data });

      const verifyResponse = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, response: credential }),
      });

      const verifyPayload = (await verifyResponse.json()) as { ok: boolean; error?: string };
      if (!verifyResponse.ok || !verifyPayload.ok) {
        setMessage(verifyPayload.error ?? "Passkey login failed");
        return;
      }

      router.push("/app/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Passkey login failed");
    }
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-3xl bg-white/90 p-6 shadow-xl">
      <h1 className="text-2xl font-semibold">Login to MCycle</h1>
      <p className="mt-2 text-sm text-zinc-700">Use biometric passkey or password.</p>

      <form className="mt-5 space-y-3" onSubmit={passwordLogin}>
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
          />
        </label>

        <button type="submit" className="w-full rounded-full bg-black py-2 text-sm font-medium text-white">
          Login with password
        </button>
      </form>

      <button
        type="button"
        onClick={passkeyLogin}
        className="mt-3 w-full rounded-full border border-black/20 py-2 text-sm font-medium"
      >
        Login with biometric passkey
      </button>

      {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}

      <p className="mt-4 text-sm text-zinc-700">
        Need an account? <Link href="/register" className="font-medium underline">Register</Link>
      </p>
    </div>
  );
}
