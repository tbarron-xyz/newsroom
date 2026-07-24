"use client";

import ContentCard from "../../components/ContentCard";
import SourceArticleCard from "../../components/SourceArticleCard";
import type { DailyEdition, Article } from "../schemas/types";

interface EnrichedEdition {
  id: string;
  stories: Article[];
  generationTime: number;
  prompt: string;
  modelName: string;
}

interface EnrichedDailyEdition {
  id: string;
  editions: EnrichedEdition[];
  generationTime: number;
  frontPageHeadline: string;
  frontPageArticle: string;
  newspaperName?: string;
  topics: DailyEdition["topics"];
  prompt: string;
  modelName: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

interface DailyEditionFullViewProps {
  edition: DailyEdition;
  badge?: string;
  enrichedData?: EnrichedDailyEdition | null;
  showPrompt?: boolean;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function DailyEditionFullView({
  edition,
  badge,
  enrichedData,
  showPrompt = true
}: DailyEditionFullViewProps) {
  return (
    <div className="space-y-8">
      <ContentCard variant="tui" className="p-8">
        <div className="border-b border-[var(--tui-border)] pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[var(--tui-primary)]">
              {edition.newspaperName || "Daily Edition"}
            </h2>
            <span className="tui-muted">
              {formatDate(edition.generationTime)}
            </span>
          </div>
          {badge && (
            <span className="px-3 py-1 border border-[#ffb000] text-[#ffb000] font-mono text-xs inline-block mb-3">
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-bold text-[var(--tui-primary)] mb-4 leading-tight">
            {edition.frontPageHeadline}
          </h1>
        </div>
        <div className="prose prose-lg max-w-none">
          <p className="tui-text-muted leading-relaxed whitespace-pre-wrap">
            {edition.frontPageArticle}
          </p>
        </div>
      </ContentCard>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--tui-primary)]">
          Today&apos;s Stories
        </h2>
        {edition.topics.map((topic, index) => (
          <ContentCard key={index} variant="tui" className="p-8">
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                  <span className="tui-muted">{index + 1}</span>
                </div>
                <span className="px-3 py-1 border border-[var(--tui-border)] tui-muted text-xs">
                  {topic.name}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--tui-primary)] mb-2">
                {topic.headline}
              </h3>
              <p className="tui-muted italic">{topic.oneLineSummary}</p>
            </div>
            <div className="prose prose-lg max-w-none mb-6">
              <p className="tui-text-muted leading-relaxed mb-4">
                {topic.newsStoryFirstParagraph}
              </p>
              <p className="tui-text-muted leading-relaxed">
                {topic.newsStorySecondParagraph}
              </p>
            </div>
          </ContentCard>
        ))}
      </div>

      {enrichedData && (
        <ContentCard variant="tui" className="p-8">
          <h2 className="text-xl font-bold text-[var(--tui-primary)] mb-6">
            Source Articles
          </h2>
          <div className="space-y-4">
            {enrichedData.editions
              .flatMap((e) => e.stories)
              .map((article) => (
                <SourceArticleCard
                  key={article.id}
                  article={article}
                  variant="tui"
                />
              ))}
          </div>
        </ContentCard>
      )}

      {showPrompt && edition.prompt && (
        <ContentCard variant="tui" className="p-8">
          <div className="flex items-center gap-2 mb-6 relative group">
            <h2 className="text-xl font-bold text-[var(--tui-primary)]">
              Generation Prompt
            </h2>
            <div className="relative group">
              <svg
                className="w-4 h-4 text-[var(--tui-primary)] cursor-help"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-[var(--tui-border)] text-[var(--tui-primary)] text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                To ensure full journalistic transparency, this is the exact
                prompt given to the AI model to generate this daily edition.
              </div>
            </div>
          </div>
          <div className="border border-[var(--tui-border)] bg-black p-4 tui-muted font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
            {edition.prompt}
          </div>
        </ContentCard>
      )}
    </div>
  );
}
