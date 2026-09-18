"use client";

import { useEffect } from "react";
import { useTimeline } from "@/components/timeline/TimelineContext";

/** Places this project on the timeline while its page is open. */
export function ProjectTimeline({ id, when, label }: { id: string; when: string; label: string }) {
  const { setPoints, setActive, setOnScrub } = useTimeline();
  useEffect(() => {
    setPoints([{ id, when, label }]);
    setActive(id);
    setOnScrub(null);
    return () => { setPoints([]); setActive(null); };
  }, [id, when, label, setPoints, setActive, setOnScrub]);
  return null;
}
