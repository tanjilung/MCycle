"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/cycle-defaults", label: "Cycle Defaults" },
  { href: "/app/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-black text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Logout
      </button>
    </div>
  );
}
