"use client";

import { useState, useEffect } from "react";
import { ResearchEntry } from "../schemas/types";
import { apiService } from "@/app/services/api.service";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-600",
  completed: "bg-green-600",
  failed: "bg-red-600"
};

export default function ResearchPage() {
  const [entries, setEntries] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResearch = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<{ research: ResearchEntry[] }>(
        "/api/research"
      );
      setEntries(data.research || []);
    } catch (error) {
      console.error("Failed to fetch research entries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Research"
        description="Wikipedia research pipeline results"
      />

      {loading ? (
        <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse">
          $ Loading research entries...
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No research entries yet"
          description="Trigger research from the Editor Settings page."
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry: any) => (
            <Link key={entry.id} href={`/research/${entry.id}`}>
              <ContentCard>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-mono text-[var(--tui-primary)]">
                      {entry.topic}
                    </h2>
                    <span
                      className={`inline-block px-3 py-1 rounded text-xs font-mono font-medium text-white ${STATUS_COLORS[entry.status] || "bg-gray-600"}`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-white/70 line-clamp-2">
                    {entry.goal}
                  </p>
                  <div className="flex items-center space-x-4 text-xs font-mono text-[var(--tui-muted)]">
                    <span>
                      {new Date(entry.generationTime).toLocaleString()}
                    </span>
                    {entry.suggestionCount !== undefined && (
                      <span>{entry.suggestionCount} articles suggested</span>
                    )}
                  </div>
                </div>
              </ContentCard>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
