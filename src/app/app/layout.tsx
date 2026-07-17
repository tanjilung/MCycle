import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <header className="rounded-3xl bg-[linear-gradient(120deg,#fef2f2,#ffedd5,#fff7ed)] p-5 shadow-lg">
        <p className="text-sm uppercase tracking-[0.15em] text-zinc-600">MCycle</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Cycle Tracking Workspace</h1>
        <p className="mt-1 text-sm text-zinc-700">
          Signed in as {user?.name ?? "User"} ({user?.email ?? ""})
        </p>
      </header>
      <AppNav />
      <main className="pb-8">{children}</main>
    </div>
  );
}
