import { useEffect, useState } from "react";
import type { Competitor, Platform } from "./demo-data";

const KEY = "sc.competitors.v1";

function read(): Competitor[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Competitor[]) : [];
  } catch {
    return [];
  }
}

function write(list: Competitor[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("sc:competitors-changed"));
}

export function useCustomCompetitors() {
  const [list, setList] = useState<Competitor[]>([]);
  useEffect(() => {
    setList(read());
    const h = () => setList(read());
    window.addEventListener("sc:competitors-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("sc:competitors-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return list;
}

export function addCustomCompetitor(input: {
  label: string;
  primaryHandle: string;
  primaryPlatform: Platform;
  about?: string;
}) {
  const item: Competitor = {
    id: `custom-${Date.now()}`,
    label: input.label,
    primaryHandle: input.primaryHandle,
    primaryPlatform: input.primaryPlatform,
    totalFollowers: 0,
    growth30d: 0,
    engagementRate: 0,
    about: input.about ?? "",
  };
  const next = [...read(), item];
  write(next);
  return item;
}

export function updateCustomCompetitor(
  id: string,
  patch: Partial<Pick<Competitor, "label" | "primaryHandle" | "primaryPlatform" | "about">>,
) {
  const next = read().map((c) => (c.id === id ? { ...c, ...patch } : c));
  write(next);
}

export function getCustomCompetitor(id: string): Competitor | undefined {
  return read().find((c) => c.id === id);
}

export function removeCustomCompetitor(id: string) {
  write(read().filter((c) => c.id !== id));
}
