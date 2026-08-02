"use client";

import { AppNav } from "@/components/AppNav";
import { ManagedPersonProvider } from "./ManagedPersonProvider";

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ManagedPersonProvider>
      <main className="pb-8">
        <AppNav />
        {children}
      </main>
    </ManagedPersonProvider>
  );
}
