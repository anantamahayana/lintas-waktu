"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Shared state for the timeline that sits at the foot of every page.
 * Pages (home hero, work grid) publish which point is "current";
 * the Timeline renders the needle there.
 */
export type TimelinePoint = {
  id: string;
  /** ISO-ish "YYYY-MM" */
  when: string;
  label: string;
  href?: string;
};

type Ctx = {
  points: TimelinePoint[];
  setPoints: (p: TimelinePoint[]) => void;
  active: string | null;
  setActive: (id: string | null) => void;
  /** consumer callback when the user scrubs to a point */
  onScrub: ((id: string) => void) | null;
  setOnScrub: (fn: ((id: string) => void) | null) => void;
};

const TimelineCtx = createContext<Ctx | null>(null);

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [onScrub, setOnScrubState] = useState<((id: string) => void) | null>(null);
  // Stable setter identity — consumers list these in effect deps
  const setOnScrub = useCallback((fn: ((id: string) => void) | null) => setOnScrubState(() => fn), []);
  const value = useMemo<Ctx>(
    () => ({ points, setPoints, active, setActive, onScrub, setOnScrub }),
    [points, active, onScrub, setOnScrub],
  );
  return <TimelineCtx.Provider value={value}>{children}</TimelineCtx.Provider>;
}

export function useTimeline() {
  const c = useContext(TimelineCtx);
  if (!c) throw new Error("useTimeline outside TimelineProvider");
  return c;
}
