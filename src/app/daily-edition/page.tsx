"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "../../components/PageContainer";
import ContentCard from "../../components/ContentCard";
import SourceArticleCard from "../../components/SourceArticleCard";
import { apiService } from "@/app/services/api.service";
import type { Article } from "../schemas/types";

interface DailyEditionComment {
  author: string;
  content: string;
  createdAt: number;
  persona: string;
}

interface Topic {
  name: string;
  headline: string;
  newsStoryFirstParagraph: string;
  newsStorySecondParagraph: string;
  oneLineSummary: string;
  comments?: DailyEditionComment[];
}

interface DailyEdition {
  id: string;
  editions: string[];
  generationTime: number;
  frontPageHeadline: string;
  frontPageArticle: string;
  newspaperName?: string;
  topics: Topic[];
  prompt: string;
}

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
  topics: Topic[];
  prompt: string;
  modelName: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export default function DailyEditionPage() {
  const [dailyEditions, setDailyEditions] = useState<DailyEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState<DailyEdition | null>(
    null
  );
  const [enrichedData, setEnrichedData] = useState<EnrichedDailyEdition | null>(
    null
  );
  const [message, setMessage] = useState("");

  const [appFullName, setAppFullName] = useState("");

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await apiService.get<{
          app: { name: string; fullName: string };
        }>("/api/config");
        setAppFullName(config.app.fullName);
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (!selectedEdition) return;
    const fetchEnriched = async () => {
      try {
        const data = await apiService.get<EnrichedDailyEdition>(
          `/api/daily-editions/${selectedEdition.id}`
        );
        setEnrichedData(data);
      } catch (error) {
        console.error("Failed to fetch enriched edition data:", error);
        setEnrichedData(null);
      }
    };
    fetchEnriched();
  }, [selectedEdition]);

  const fetchEditions = async () => {
    try {
      const data = await apiService.get<DailyEdition[]>("/api/daily-editions");
      setDailyEditions(data);
      if (data.length > 0) {
        setSelectedEdition(data[0]);
      }
    } catch (error) {
      setMessage("Error loading editions");
      console.error("Error fetching editions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateShort = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      {message && (
        <div className="mb-6 tui-msg-error text-center">{message}</div>
      )}

      {dailyEditions.length === 0 ? (
        <ContentCard variant="tui" className="p-12 text-center">
          <div className="w-16 h-16 border border-[var(--tui-border)] flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[var(--tui-primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[var(--tui-primary)] mb-2">
            No Daily Editions Available
          </h3>
          <p className="tui-text-muted">
            Daily editions are generated automatically. Check back later!
          </p>
        </ContentCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <ContentCard variant="tui" className="p-6">
              <h2 className="text-lg font-semibold text-[var(--tui-primary)] mb-4">
                Available Editions
              </h2>
              <div className="space-y-2">
                {dailyEditions.map((edition) => (
                  <button
                    key={edition.id}
                    onClick={() => setSelectedEdition(edition)}
                    className={`w-full text-left px-4 py-3 transition-all duration-300 ${
                      selectedEdition?.id === edition.id
                        ? "bg-[var(--tui-hover-bg)] border-2 border-[var(--tui-primary)] text-[var(--tui-primary)]"
                        : "bg-black border border-[var(--tui-border)] text-[var(--tui-muted)] hover:bg-[var(--tui-hover-bg)]"
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {edition.newspaperName || "Daily Edition"}
                    </div>
                    <div className="tui-text-muted mt-1">
                      {new Date(edition.generationTime).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        }
                      )}
                    </div>
                    <div className="tui-text-muted">
                      {edition.topics.length} topics
                    </div>
                  </button>
                ))}
              </div>
            </ContentCard>
          </div>

          <div className="lg:col-span-3">
            {selectedEdition && (
              <div className="space-y-8">
                <ContentCard variant="tui" className="p-8">
                  <div className="border-b border-[var(--tui-border)] pb-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-[var(--tui-primary)]">
                        {selectedEdition.newspaperName || "Daily Edition"}
                      </h2>
                      <span className="tui-muted">
                        {new Date(
                          selectedEdition.generationTime
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--tui-primary)] mb-4 leading-tight">
                      {selectedEdition.frontPageHeadline}
                    </h1>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="tui-text-muted leading-relaxed whitespace-pre-wrap">
                      {selectedEdition.frontPageArticle}
                    </p>
                  </div>
                </ContentCard>

                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-[var(--tui-primary)]">
                    Today's Stories
                  </h2>
                  {selectedEdition.topics.map((topic, index) => (
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
                        <p className="tui-muted italic">
                          {topic.oneLineSummary}
                        </p>
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
                        To ensure full journalistic transparency, this is the
                        exact prompt given to the AI model to generate this
                        daily edition.
                      </div>
                    </div>
                  </div>
                  <div className="border border-[var(--tui-border)] bg-black p-4 tui-muted font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {selectedEdition.prompt}
                  </div>
                </ContentCard>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center mt-12">
        <p className="tui-text-muted">{appFullName} Daily Edition Reader</p>
      </div>
    </PageContainer>
  );
}
