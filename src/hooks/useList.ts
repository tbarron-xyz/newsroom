"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/app/services/api.service";

export function useList<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.get<T[]>(endpoint);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [endpoint]);

  return { data, setData, loading, error, refetch: fetch };
}