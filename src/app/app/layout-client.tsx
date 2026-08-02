"use client";

import { AppNav } from "@/components/AppNav";
import { ManagedPersonProvider } from "./ManagedPersonProvider";

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ManagedPersonProvider>
      <AppNav />
      <main className="pb-8">{children}</main>
    </ManagedPersonProvider>
  );
}
