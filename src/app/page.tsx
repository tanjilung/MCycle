import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-4 py-16 md:px-8">
      <section className="grid gap-6 rounded-[2rem] bg-[linear-gradient(135deg,#fff7ed,#ffedd5,#fee2e2)] p-8 shadow-xl md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-600">MCycle</p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
            Understand your menstrual cycle with privacy-first predictions.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Track menstruation dates, manage phase windows, and view next ovulation and menstruation highlights in a monthly calendar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-medium"
            >
              Login with passkey
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white/85 p-5 shadow-lg">
          <h2 className="text-xl font-semibold">Core Features</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>Biometric passkey authentication with password fallback</li>
            <li>Persistent PostgreSQL database</li>
            <li>Monthly cycle calendar with phase and prediction highlights</li>
            <li>Editable defaults for cycle and phase durations</li>
            <li>Phase-level editing with this-cycle or future-cycles scope</li>
          </ul>
        </div>
      </section>

      <p className="text-sm text-zinc-600">
        MCycle is for tracking support and education. It is not a medical diagnosis tool.
      </p>
    </div>
  );
}
