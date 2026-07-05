"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "@/app/services/api.service";
import { OpinionArticle } from "@/app/schemas/types";

const PERSONA_COLORS: Record<string, string> = {
  "US conservative": "from-red-600 to-red-800",
  "US liberal": "from-blue-600 to-blue-800",
  "financial globalist": "from-emerald-600 to-emerald-800",
  "national populist": "from-orange-600 to-orange-800"
};

export default function OpinionArticlePage() {
  const params = useParams();
  const opinionId = params.id as string;
  const [opinion, setOpinion] = useState<OpinionArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOpinion = useCallback(async () => {
    try {
      const data = await apiService.get<OpinionArticle>(
        `/api/opinion/${opinionId}`
      );
      setOpinion(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        setError("Opinion article not found");
      } else {
        setError("Error loading opinion article");
        console.error("Error fetching opinion article:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [opinionId]);

  useEffect(() => {
    if (opinionId) {
      fetchOpinion();
    }
  }, [opinionId, fetchOpinion]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)] p-6">
            <h2 className="text-xl font-semibold text-[var(--tui-primary)] font-mono mb-2">
              Error Loading Opinion
            </h2>
            <p className="tui-muted">{error}</p>
            <Link href="/opinion" className="tui-btn inline-block mt-4">
              ← Back to Opinion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!opinion) {
    return null;
  }

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Opinion Article"
          description={opinion.persona}
        >
          <Link href="/opinion" className="tui-btn">
            ← Back to Opinion
          </Link>
        </PageHeader>
      </ContentCard>

      <ContentCard variant="tui" className="p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-block px-3 py-1 rounded text-xs font-mono font-medium text-white bg-gradient-to-r ${PERSONA_COLORS[opinion.persona] || "from-gray-600 to-gray-800"}`}
            >
              {opinion.persona}
            </span>
          </div>
          <h2 className="text-3xl font-bold tui-text-primary mb-4 leading-tight">
            {opinion.headline}
          </h2>
          <div className="flex items-center tui-text-muted text-sm space-x-4">
            <span>{formatDate(opinion.generationTime)}</span>
            <span>Model: {opinion.modelName}</span>
          </div>
        </div>

        <div className="mb-8">
          <div className="tui-text-muted leading-relaxed whitespace-pre-wrap font-mono text-sm">
            {opinion.content}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--tui-border)]">
          <div className="flex items-center justify-between tui-text-muted text-xs">
            <span>Context: {opinion.articleIds.length} articles</span>
            {opinion.inputTokenCount ? (
              <span>{opinion.inputTokenCount} input tokens</span>
            ) : null}
            {opinion.outputTokenCount ? (
              <span>{opinion.outputTokenCount} output tokens</span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--tui-border)]">
          <div className="flex items-center justify-between tui-text-muted text-xs">
            <span>Opinion ID: {opinion.id}</span>
          </div>
        </div>
      </ContentCard>

      <div className="text-center mt-12">
        <p className="tui-text-muted">Newsroom Opinion</p>
      </div>
    </PageContainer>
  );
}
