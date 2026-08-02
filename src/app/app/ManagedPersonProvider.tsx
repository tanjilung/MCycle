"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; name: string };

const ManagedPersonContext = createContext<{
  currentId: string | null;
  setCurrentId: (id: string) => void;
}>({ currentId: null, setCurrentId: () => {} });

export function useManagedPerson() {
  return useContext(ManagedPersonContext);
}

export function ManagedPersonProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentId, setCurrentIdState] = useState<string | null>(null);

  // Initialize from URL query param or localStorage
  useEffect(() => {
    const url = new URL(window.location.href);
    const personParam = url.searchParams.get("person");
    if (personParam) {
      setCurrentIdState(personParam);
      return;
    }
    const stored = localStorage.getItem("mcycle:selected_managed_person_id");
    if (stored) setCurrentIdState(stored);
  }, []);

  const setCurrentId = useCallback((id: string) => {
    setCurrentIdState(id);
    localStorage.setItem("mcycle:selected_managed_person_id", id);
    // Update URL without navigation
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("person", id);
    } else {
      url.searchParams.delete("person");
    }
    window.history.pushState({}, "", url.toString());
    // Refresh all server and client components with the new managed person
    router.refresh();
  }, []);

  return (
    <ManagedPersonContext.Provider value={{ currentId, setCurrentId }}>
      {children}
    </ManagedPersonContext.Provider>
  );
}
