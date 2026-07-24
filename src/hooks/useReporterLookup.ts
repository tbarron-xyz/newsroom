"use client";

import { useMemo } from "react";
import { useList } from "@/hooks/useList";
import type { Reporter } from "@/app/schemas/types";

export function useReporterLookup(): Map<string, string> {
  const { data: reporters } = useList<Reporter>("/api/reporters");

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reporters) {
      map.set(r.id, r.displayName || r.id);
    }
    return map;
  }, [reporters]);
}
