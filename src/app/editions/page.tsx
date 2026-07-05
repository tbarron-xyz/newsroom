"use client";

import { useState, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import ContentCard from "../../components/ContentCard";
import PageHeader from "../../components/PageHeader";
import SourceArticleCard from "../../components/SourceArticleCard";
import { apiService } from "../services/api.service";
import { useList } from "@/hooks/useList";
import type { Article } from "../schemas/types";

interface NewspaperEdition {
  id: string;
  stories: string[] | Article[];
  generationTime: number;
  prompt: string;
}

export default function EditionsPage() {
  const {
    data: editionsData,
    loading,
    refetch: refetchEditions
  } = useList<NewspaperEdition>("/api/editions/latest");
  const [editions, setEditions] = useState<NewspaperEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [message, setMessage] = useState("");
  const [appName, setAppName] = useState("Newsroom");
  const [expandedEdition, setExpandedEdition] = useState<string | null>(null);
  const [loadingArticles, setLoadingArticles] = useState<string | null>(null);
  const [showAllArticles, setShowAllArticles] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await apiService.get<{ app: { name: string } }>(
          "/api/config"
        );
        setAppName(config.app.name);
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const loadEditions = async () => {
      if (!editionsData || editionsData.length === 0) return;

      setLoadingEditions(true);
      try {
        const fullEditions = await Promise.all(
          editionsData.map(
            async (edition: NewspaperEdition) =>
              await apiService.get<NewspaperEdition>(
                `/api/editions/${edition.id}`
              )
          )
        );

        setEditions(fullEditions);
      } catch (error) {
        setMessage("Error loading newspaper editions");
        console.error("Error fetching newspaper editions:", error);
      } finally {
        setLoadingEditions(false);
      }
    };
    loadEditions();
  }, [editionsData]);

  const fetchEditionWithArticles = async (editionId: string) => {
    setLoadingArticles(editionId);
    try {
      const data = await apiService.get<NewspaperEdition>(
        `/api/editions/${editionId}`
      );
      setEditions((prev) => prev.map((e) => (e.id === editionId ? data : e)));
    } catch (error) {
      console.error("Error fetching edition articles:", error);
    } finally {
      setLoadingArticles(null);
      setExpandedEdition(editionId);
    }
  };

  const toggleEdition = (editionId: string) => {
    setExpandedEdition((prev) => (prev === editionId ? null : editionId));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading || loadingEditions) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading editions...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Newspaper Editions"
          description="Browse the latest AI-generated newspaper editions"
        />
      </ContentCard>

      {message && (
        <div className="mb-6 tui-msg-error text-center">{message}</div>
      )}

      {editions.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold tui-text-primary mb-2">
            No Editions Available
          </h3>
          <p className="tui-text-muted">
            Newspaper editions are generated automatically. Check back later!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {editions.map((edition: NewspaperEdition) => {
            const isExpanded = expandedEdition === edition.id;
            const articles = edition.stories as Article[];
            const hasFullArticles = articles[0] && "headline" in articles[0];

            return (
              <ContentCard variant="tui" key={edition.id} className="p-6">
                <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold tui-text-primary mb-2">
                      Newspaper Edition
                    </h2>
                    <p className="tui-text-muted mb-2">
                      {formatDate(edition.generationTime)}
                    </p>
                    <p className="tui-text-muted">
                      {edition.stories.length} stories included
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllArticles(!showAllArticles)}
                    disabled={loadingArticles === edition.id}
                    className="tui-btn"
                  >
                    {loadingArticles === edition.id
                      ? "Loading..."
                      : showAllArticles
                        ? "Hide Articles"
                        : "View Articles"}
                  </button>
                </div>

                {showAllArticles && hasFullArticles && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold tui-text-primary mb-2">
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

                <div className="text-center tui-text-muted">
                  Edition ID: {edition.id.slice(0, 12)}...
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--tui-border)]">
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
                        To ensure full journalistic transparency, this is the
                        exact prompt given to the AI model to generate this
                        edition. This allows the user to verify that no funny
                        business has taken place.
                      </div>
                    </div>
                  </div>
                  <div className="border border-[var(--tui-border)] bg-black p-3 text-xs text-[var(--tui-muted)] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {edition.prompt}
                  </div>
                </div>
              </ContentCard>
            );
          })}
        </div>
      )}

      <div className="text-center mt-12">
        <p className="tui-text-muted">{appName} Edition Archive</p>
      </div>
    </PageContainer>
  );
}
