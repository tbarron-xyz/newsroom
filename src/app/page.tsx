"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "../components/PageContainer";
import ContentCard from "../components/ContentCard";
import { apiService } from "@/app/services/api.service";
import type { DailyEdition, OpinionArticle, Article } from "./schemas/types";

export default function Home() {
  const [edition, setEdition] = useState<DailyEdition | null>(null);
  const [opinions, setOpinions] = useState<OpinionArticle[]>([]);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [editionsData, opinionsData, articlesData] = await Promise.all([
          apiService.get<DailyEdition[]>("/api/daily-editions"),
          apiService.get<{ opinions: OpinionArticle[] }>("/api/opinion/public"),
          apiService.get<Article[]>("/api/articles/public?limit=8"),
        ]);
        if (editionsData.length > 0) {
          setEdition(editionsData[0]);
        }
        setOpinions(opinionsData.opinions || []);
        setLatestArticles(articlesData || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  if (!edition) {
    return (
      <PageContainer variant="tui" maxWidth="max-w-7xl">
        <ContentCard variant="tui" className="p-12 text-center">
          <div className="w-16 h-16 border border-[var(--tui-border)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--tui-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[var(--tui-primary)] mb-2">No Content Yet</h3>
          <p className="tui-text-muted">Daily editions are generated automatically. Check back later!</p>
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <aside className="space-y-6 lg:order-last">
          <ContentCard variant="tui" className="p-6">
            <h2 className="text-lg font-bold text-[var(--tui-primary)] mb-4">Opinion</h2>
            {opinions.length === 0 ? (
              <p className="tui-muted text-sm">No opinion articles yet.</p>
            ) : (
              <div className="space-y-3">
                {opinions.map((opinion) => (
                  <Link
                    key={opinion.id}
                    href={`/opinion/${opinion.id}`}
                    className="block tui-muted hover:text-[var(--tui-primary)] transition-colors text-sm leading-snug"
                  >
                    <span className="tui-muted mr-2 select-none">❯</span>{opinion.headline}
                  </Link>
                ))}
              </div>
            )}
          </ContentCard>

          <ContentCard variant="tui" className="p-6">
            <h2 className="text-lg font-bold text-[var(--tui-primary)] mb-4">Latest Articles</h2>
            {latestArticles.length === 0 ? (
              <p className="tui-muted text-sm">No articles yet.</p>
            ) : (
              <div className="space-y-2">
                {latestArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.id}`}
                    className="block tui-muted hover:text-[var(--tui-primary)] transition-colors text-sm leading-snug"
                  >
                    <span className="tui-muted mr-2 select-none">❯</span>{article.headline}
                  </Link>
                ))}
              </div>
            )}
          </ContentCard>
        </aside>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[var(--tui-primary)]">Today's Stories</h2>
          {edition.topics.map((topic, index) => (
            <ContentCard key={index} variant="tui" className="p-8">
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                    <span className="tui-muted">{index + 1}</span>
                  </div>
                  <span className="px-3 py-1 border border-[var(--tui-border)] tui-muted text-xs">{topic.name}</span>
                  <span className="tui-muted">
                    {new Date(edition.generationTime).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[var(--tui-primary)] mb-2">{topic.headline}</h3>
                <p className="tui-muted italic">{topic.oneLineSummary}</p>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="tui-text-muted leading-relaxed mb-4">{topic.newsStoryFirstParagraph}</p>
                <p className="tui-text-muted leading-relaxed">{topic.newsStorySecondParagraph}</p>
              </div>
            </ContentCard>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
