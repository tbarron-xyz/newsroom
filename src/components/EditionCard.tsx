"use client";

import { useState } from "react";
import ContentCard from "./ContentCard";
import SourceArticleCard from "./SourceArticleCard";
import ExpandableSection from "./ExpandableSection";
import type { Article } from "@/app/schemas/types";

export interface EditionCardEdition {
  id: string;
  stories: Article[];
  generationTime: number;
  prompt: string;
  modelName: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

interface EditionCardProps {
  edition: EditionCardEdition;
  showArticles: boolean;
  onToggleArticles?: () => void;
  articlesLoading?: boolean;
  collapsePrompt?: boolean;
  showEditionId?: boolean;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function EditionCard({
  edition,
  showArticles,
  onToggleArticles,
  articlesLoading,
  collapsePrompt,
  showEditionId
}: EditionCardProps) {
  const articles = edition.stories;
  const hasFullArticles = articles[0] && "headline" in articles[0];

  return (
    <ContentCard variant="tui" className="p-6">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <p className="tui-text-muted mb-2">
            {formatDate(edition.generationTime)}
          </p>
          <p className="tui-text-muted">
            {edition.stories.length} stories included
          </p>
        </div>
        {onToggleArticles && (
          <button
            onClick={onToggleArticles}
            disabled={articlesLoading}
            className="tui-btn"
          >
            {articlesLoading
              ? "Loading..."
              : showArticles
                ? "Hide Articles"
                : "View Articles"}
          </button>
        )}
      </div>

      {showArticles && hasFullArticles && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold tui-text-primary mb-4">
            Articles
          </h4>
          <div className="space-y-4">
            {articles.map((article: Article) => (
              <SourceArticleCard
                key={article.id}
                article={article}
                variant="tui"
              />
            ))}
          </div>
        </div>
      )}

      {showEditionId && (
        <div className="text-center tui-text-muted mb-4">
          Edition ID: {edition.id.slice(0, 12)}...
        </div>
      )}

      <div className="pt-4 border-t border-[var(--tui-border)]">
        {collapsePrompt ? (
          <PromptCollapsible prompt={edition.prompt} />
        ) : (
          <PromptVisible prompt={edition.prompt} />
        )}
      </div>
    </ContentCard>
  );
}

function PromptCollapsible({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ExpandableSection
      title="Generation Prompt"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      variant="tui"
    >
      <div className="border border-[var(--tui-border)] bg-black p-3 text-xs text-[var(--tui-muted)] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
        {prompt}
      </div>
    </ExpandableSection>
  );
}

function PromptVisible({ prompt }: { prompt: string }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2 relative group">
        <h4 className="text-sm font-semibold tui-text-primary">
          Generation Prompt
        </h4>
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
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-[var(--tui-border)] text-[var(--tui-primary)] text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 font-mono">
            To ensure full journalistic transparency, this is the exact prompt
            given to the AI model to generate this edition. This allows the user
            to verify that no funny business has taken place.
          </div>
        </div>
      </div>
      <div className="border border-[var(--tui-border)] bg-black p-3 text-xs text-[var(--tui-muted)] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
        {prompt}
      </div>
    </>
  );
}
