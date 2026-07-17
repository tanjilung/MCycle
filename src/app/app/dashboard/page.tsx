import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const now = new Date();
  const monthPath = `/app/calendar/${format(now, "yyyy")}/${format(now, "MM")}`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
        <h2 className="text-xl font-semibold">Track your cycle each month</h2>
        <p className="mt-2 text-zinc-700">
          Pick a menstruation start date to predict your next ovulation and next menstruation.
        </p>
        <Link
          href={monthPath}
          className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Open this month calendar
        </Link>
      </section>

      <section className="rounded-3xl bg-white/90 p-5 shadow-lg">
        <h2 className="text-xl font-semibold">Customize phase defaults</h2>
        <p className="mt-2 text-zinc-700">
          Set your default cycle length and phase durations for menstruation, follicular, ovulation, and luteal phases.
        </p>
        <Link
          href="/app/cycle-defaults"
          className="mt-4 inline-flex rounded-full border border-black/20 px-4 py-2 text-sm font-medium text-zinc-800"
        >
          Edit defaults
        </Link>
      </section>
    </div>
  );
}
