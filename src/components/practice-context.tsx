"use client";

import { createContext, useContext } from "react";

export type PracticeContextValue = {
  id: string;
  name: string;
  timezone: string;
  claimWindowMinutes: number;
  recipientsPerWave: number;
  defaultDurationMinutes: number;
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

export function PracticeProvider({
  value,
  children,
}: {
  value: PracticeContextValue;
  children: React.ReactNode;
}) {
  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePractice() {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error("usePractice must be used within a PracticeProvider");
  }
  return context;
}
