"use client";

import { useState, useEffect } from "react";
import { OpinionArticle } from "../schemas/types";
import { apiService } from "@/app/services/api.service";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";

const PERSONA_COLORS: Record<string, string> = {
  "US conservative": "from-red-600 to-red-800",
  "US liberal": "from-blue-600 to-blue-800",
  "financial globalist": "from-emerald-600 to-emerald-800",
  "national populist": "from-orange-600 to-orange-800"
};

export default function OpinionPage() {
  const [opinions, setOpinions] = useState<OpinionArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpinions = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<{ opinions: OpinionArticle[] }>(
        "/api/opinion"
      );
      setOpinions(data.opinions || []);
    } catch (error) {
      console.error("Failed to fetch opinion articles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpinions();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Opinion"
        description="AI-generated opinion pieces reacting to the latest news"
      />

      {loading ? (
        <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse">
          $ Loading opinions...
        </div>
      ) : opinions.length === 0 ? (
        <EmptyState title="No opinion articles yet" description="Trigger generation from the Editor Settings page." />
      ) : (
        <div className="space-y-8">
          {opinions.map((opinion) => (
            <ContentCard key={opinion.id}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-mono text-[var(--tui-primary)]">
                    {opinion.headline}
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block px-3 py-1 rounded text-xs font-mono font-medium text-white bg-gradient-to-r ${PERSONA_COLORS[opinion.persona] || "from-gray-600 to-gray-800"}`}
                  >
                    {opinion.persona}
                  </span>
                  <span className="text-xs font-mono text-[var(--tui-muted)]">
                    {new Date(opinion.generationTime).toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-[var(--tui-muted)]">
                    Model: {opinion.modelName}
                  </span>
                </div>

                <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed whitespace-pre-wrap text-white/80">
                  {opinion.content}
                </div>

                <div className="text-xs font-mono text-[var(--tui-muted)] border-t border-[var(--tui-border)] pt-2">
                  Context: {opinion.articleIds.length} articles
                  {opinion.inputTokenCount
                    ? ` | ${opinion.inputTokenCount} input tokens`
                    : ""}
                  {opinion.outputTokenCount
                    ? ` | ${opinion.outputTokenCount} output tokens`
                    : ""}
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
