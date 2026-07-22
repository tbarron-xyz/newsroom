"use client";

import { useState, useEffect } from "react";
import {
  ResearchEntry,
  NextArticleSuggestion,
  ArticleSummary,
  ResearchLLMCall
} from "../../schemas/types";
import { apiService } from "@/app/services/api.service";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import ContentCard from "@/components/ContentCard";
import { useParams } from "next/navigation";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  "natural-continuation": "bg-blue-600",
  "foundational-concept": "bg-purple-600",
  "historical-context": "bg-amber-600",
  "causal-explanation": "bg-green-600",
  "cross-disciplinary": "bg-pink-600",
  "surprising-trivia": "bg-orange-600",
  "goal-advancement": "bg-teal-600",
  "perspective-broadening": "bg-indigo-600"
};

export default function ResearchDetailPage() {
  const params = useParams();
  const [entry, setEntry] = useState<ResearchEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(
    new Set()
  );

  const fetchEntry = async () => {
    try {
      const data = await apiService.get<ResearchEntry>(
        `/api/research/${params.id}`
      );
      setEntry(data);
    } catch (error) {
      console.error("Failed to fetch research entry:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntry();
  }, [params.id]);

  useEffect(() => {
    if (entry?.status === "pending") {
      const interval = setInterval(() => {
        fetchEntry();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [entry?.status]);

  const toggleSummary = (title: string) => {
    setExpandedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse">
          $ Loading research entry...
        </div>
      </PageContainer>
    );
  }

  if (!entry) {
    return (
      <PageContainer>
        <div className="text-[var(--tui-primary)] font-mono text-sm">
          Research entry not found.
        </div>
        <Link href="/research" className="tui-btn mt-4 inline-block">
          Back to Research
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/research" className="tui-btn mb-4 inline-block">
        &larr; Back to Research
      </Link>

      <PageHeader title={entry.topic} description={entry.goal} />

      {entry.status === "pending" && (
        <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse mb-6">
          $ Research in progress...
        </div>
      )}

      {entry.status === "failed" && (
        <ContentCard>
          <div className="text-red-400 font-mono text-sm">
            Research failed: {entry.errorMessage || "Unknown error"}
          </div>
        </ContentCard>
      )}

      {entry.status === "completed" && (
        <>
          <div className="text-xs font-mono text-[var(--tui-muted)] mb-6">
            Generated: {new Date(entry.generationTime).toLocaleString()}
            {entry.modelName ? ` | Model: ${entry.modelName}` : ""}
            {entry.inputTokenCount
              ? ` | ${entry.inputTokenCount} input tokens`
              : ""}
            {entry.outputTokenCount
              ? ` | ${entry.outputTokenCount} output tokens`
              : ""}
          </div>

          {entry.suggestions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-mono text-[var(--tui-primary)] mb-4">
                Suggested Articles
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {entry.suggestions.map(
                  (suggestion: NextArticleSuggestion, i: number) => (
                    <ContentCard key={i}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <a
                            href={suggestion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--tui-primary)] font-mono text-sm hover:underline"
                          >
                            {suggestion.title}
                          </a>
                          <span className="text-xs font-mono text-[var(--tui-muted)] shrink-0 ml-2">
                            {suggestion.score}/100
                          </span>
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-mono text-white ${TYPE_COLORS[suggestion.recommendationType] || "bg-gray-600"}`}
                        >
                          {suggestion.recommendationType}
                        </span>
                        <p className="text-sm font-mono text-white/70">
                          {suggestion.reason}
                        </p>
                      </div>
                    </ContentCard>
                  )
                )}
              </div>
            </div>
          )}

          {entry.summaries.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-mono text-[var(--tui-primary)] mb-4">
                Article Summaries
              </h2>
              <div className="space-y-2">
                {entry.summaries.map((summary: ArticleSummary, i: number) => (
                  <ContentCard key={i}>
                    <button
                      onClick={() => toggleSummary(summary.articleTitle)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-mono text-[var(--tui-primary)]">
                          {summary.articleTitle}
                        </h3>
                        <span className="text-xs text-[var(--tui-muted)]">
                          {expandedSummaries.has(summary.articleTitle)
                            ? "[-]"
                            : "[+]"}
                        </span>
                      </div>
                    </button>
                    {expandedSummaries.has(summary.articleTitle) && (
                      <div className="mt-3 space-y-3">
                        {summary.summaryParagraphs.map((para, j) => (
                          <p
                            key={j}
                            className="text-sm font-mono text-white/80 leading-relaxed"
                          >
                            {para}
                          </p>
                        ))}
                      </div>
                    )}
                  </ContentCard>
                ))}
              </div>
            </div>
          )}

          {entry.findingsDocument && (
            <div className="mb-8">
              <h2 className="text-lg font-mono text-[var(--tui-primary)] mb-4">
                Findings Document
              </h2>
              <ContentCard>
                <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed whitespace-pre-wrap text-white/80">
                  {entry.findingsDocument}
                </div>
              </ContentCard>
            </div>
          )}
        </>
      )}

      {/* LLM Calls Box — always visible */}
      <div className="mb-8">
        <h2 className="text-lg font-mono text-[var(--tui-primary)] mb-4">
          $ LLM Calls
        </h2>
        <ContentCard>
          {entry.currentPhase && (
            <div className="text-[var(--tui-primary)] font-mono text-xs mb-3">
              <span
                className={entry.status === "pending" ? "animate-pulse" : ""}
              >
                ${" "}
                {entry.currentPhase === "suggesting"
                  ? "Suggesting articles..."
                  : entry.currentPhase === "summarizing"
                    ? "Summarizing articles..."
                    : entry.currentPhase === "synthesizing"
                      ? "Synthesizing findings..."
                      : entry.currentPhase === "completed"
                        ? "Completed"
                        : entry.currentPhase === "failed"
                          ? "Failed"
                          : entry.currentPhase}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            {/* Suggest Next Articles call */}
            {renderLLMCallRow(
              entry.llmCalls?.find((c) => c.step === "suggest-next-articles"),
              "Suggest Next Articles",
              "suggest-next-articles"
            )}

            {/* Summarize Article calls */}
            {(
              entry.llmCalls?.filter((c) => c.step === "summarize-article") ??
              []
            ).length > 0 ? (
              entry.llmCalls
                ?.filter((c) => c.step === "summarize-article")
                .map((call, i) =>
                  renderLLMCallRow(
                    call,
                    call.articleTitle
                      ? `Summarize: ${call.articleTitle}`
                      : `Summarize article ${i + 1}`,
                    `summarize-article-${i}`
                  )
                )
            ) : entry.status !== "pending" ||
              entry.llmCalls?.some(
                (c) => c.step === "suggest-next-articles"
              ) ? null : (
              <div
                key="summaries-placeholder"
                className="flex items-center gap-2 text-xs font-mono text-[var(--tui-muted)] pl-4"
              >
                <span className="text-yellow-500">⏳</span>
                <span>Summaries pending...</span>
              </div>
            )}

            {/* Synthesize Findings call */}
            {renderLLMCallRow(
              entry.llmCalls?.find((c) => c.step === "synthesize-findings"),
              "Synthesize Findings",
              "synthesize-findings"
            )}
          </div>

          {/* Total tokens */}
          <div className="border-t border-white/10 pt-2 mt-3 flex justify-between text-xs font-mono text-[var(--tui-muted)]">
            <span>
              Total: {formatNumber(entry.inputTokenCount ?? 0)} in /{" "}
              {formatNumber(entry.outputTokenCount ?? 0)} out
            </span>
            {(entry.llmCalls?.length ?? 0) > 0 && (
              <span>
                {entry.llmCalls?.length} call
                {(entry.llmCalls?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function renderLLMCallRow(
  call: ResearchLLMCall | undefined,
  label: string,
  key: string
) {
  if (call) {
    return (
      <div key={key} className="flex items-center gap-2 text-xs font-mono">
        <span className="text-green-500 shrink-0">&#10003;</span>
        <span className="text-white/80 truncate">{label}</span>
        <span className="text-[var(--tui-muted)] shrink-0 ml-auto">
          {call.modelName
            ? `${call.modelName}  ·  ${formatNumber(call.inputTokens)} in / ${formatNumber(call.outputTokens)} out`
            : `${formatNumber(call.inputTokens)} in / ${formatNumber(call.outputTokens)} out`}
        </span>
      </div>
    );
  }

  return (
    <div
      key={key}
      className="flex items-center gap-2 text-xs font-mono text-[var(--tui-muted)]"
    >
      <span className="text-yellow-500 shrink-0">⏳</span>
      <span className="truncate">{label}</span>
      <span className="ml-auto shrink-0">waiting...</span>
    </div>
  );
}
