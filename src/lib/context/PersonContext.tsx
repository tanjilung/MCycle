"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type PersonContextType = {
  managedPersonId: string | null;
  setManagedPersonId: (id: string | null) => void;
};

const PersonContext = createContext<PersonContextType | undefined>(undefined);

export function PersonProvider({ children }: { children: ReactNode }) {
  const [managedPersonId, setManagedPersonId] = useState<string | null>(null);

  // Initialize: pick first person if available
  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((people) => {
        if (people.length > 0) {
          setManagedPersonId(people[0].id);
        }
      });
  }, []);

  return (
    <PersonContext.Provider value={{ managedPersonId, setManagedPersonId }}>
      {children}
    </PersonContext.Provider>
  );
}

export function useManagedPerson() {
  const context = useContext(PersonContext);
  if (!context) {
    throw new Error("useManagedPerson must be used within a PersonProvider");
  }
  return context;
}
