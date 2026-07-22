"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "@/app/services/api.service";
import type { Article } from "../schemas/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!q.trim()) {
      setArticles([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiService.get<Article[]>(
          `/api/articles/search?q=${encodeURIComponent(q)}`
        );
        setArticles(data);
      } catch (err: any) {
        setError(err?.message || "Search failed");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Search Articles"
          description={
            q.trim()
              ? `Results for "${q}"`
              : "Enter a search term to find articles"
          }
        >
          <Link href="/" className="tui-btn">
            ← Home
          </Link>
        </PageHeader>
      </ContentCard>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="ml-4 tui-muted">Searching...</p>
        </div>
      ) : error ? (
        <ContentCard variant="tui" className="p-8">
          <div className="border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)] p-6 text-center">
            <h3 className="text-xl font-semibold text-[var(--tui-primary)] mb-2">
              Error
            </h3>
            <p className="tui-muted">{error}</p>
          </div>
        </ContentCard>
      ) : !q.trim() ? (
        <ContentCard variant="tui" className="p-8">
          <p className="tui-muted text-center">
            Type a keyword in the search box above to find articles.
          </p>
        </ContentCard>
      ) : articles.length === 0 ? (
        <ContentCard variant="tui" className="p-8">
          <p className="tui-muted text-center">
            No articles found for &ldquo;{q}&rdquo;
          </p>
        </ContentCard>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <ContentCard variant="tui" key={article.id} className="p-8">
              <div className="mb-4">
                <Link href={`/articles/${article.id}`} className="block group">
                  <h2 className="text-2xl font-bold tui-link mb-2">
                    {article.headline}
                  </h2>
                </Link>
                <div className="flex items-center tui-text-muted space-x-4">
                  <span>{formatDate(article.generationTime)}</span>
                  {article.reporterId && (
                    <span>Reporter: {article.reporterId}</span>
                  )}
                </div>
              </div>
              <p className="tui-text-muted leading-relaxed">
                {article.body.length > 300
                  ? `${article.body.slice(0, 300)}...`
                  : article.body}
              </p>
              <div className="mt-4">
                <Link
                  href={`/articles/${article.id}`}
                  className="tui-btn text-sm"
                >
                  Read Full Article →
                </Link>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
            <p className="mt-4 tui-muted">Loading...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
