"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import ExpandableSection from "@/components/ExpandableSection";
import SourceMessageCard from "@/components/SourceMessageCard";
import { apiService } from "@/app/services/api.service";
import { useAuth } from "@/hooks/useAuth";

interface Article {
  id: string;
  reporterId: string;
  headline: string;
  body: string;
  generationTime: number;
  prompt: string;
  messageIds: string[];
  messageTexts: string[];
  messageDids: string[];
  messageRkeys: string[];
}

function ArticlesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reporterId = searchParams.get("reporterId");
  const { user, hasReader } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(
    new Set()
  );
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const [appName, setAppName] = useState("Newsroom");

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

  const fetchArticles = useCallback(async () => {
    try {
      let data;
      if (reporterId) {
        data = await apiService.get<Article[]>(
          `/api/articles?reporterId=${reporterId}`
        );
      } else {
        if (hasReader) {
          data = await apiService.get<Article[]>("/api/articles/all");
        } else {
          data = await apiService.get<Article[]>("/api/articles/public");
        }
      }

      setArticles(data);
    } catch (error: any) {
      setError(error?.message || "Error loading articles");
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  }, [reporterId, hasReader]);

  useEffect(() => {
    if (reporterId) {
      fetchArticles();
    } else {
      // For all articles view, fetch regardless of reader access (will use public endpoint if needed)
      fetchArticles();
    }
  }, [reporterId, fetchArticles]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const togglePrompt = (articleId: string) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedPrompts(newExpanded);
  };

  const toggleMessages = (articleId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedMessages(newExpanded);
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)] p-6">
            <h2 className="text-xl font-semibold text-[var(--tui-primary)] font-mono mb-2">
              Error Loading Articles
            </h2>
            <p className="tui-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title={
            reporterId
              ? "Articles by Reporter"
              : !hasReader
                ? "Latest Articles"
                : "All Articles"
          }
          description={
            reporterId
              ? `Reporter ${reporterId.split("_")[2] || reporterId} (${articles.length} articles)`
              : !hasReader
                ? `Showing the ${articles.length} most recent articles (login with Reader access to see all articles)`
                : `Chronological list of all published articles (${articles.length} articles)`
          }
        >
          {reporterId ? (
            <Link href="/reporters" className="tui-btn">
              ← Back to Reporters
            </Link>
          ) : (
            <Link href="/" className="tui-btn">
              ← Back to Daily Edition
            </Link>
          )}
        </PageHeader>
      </ContentCard>

      {/* Articles List */}
      <div className="space-y-6">
        {articles.length === 0 ? (
          <div className="border border-[var(--tui-border)] p-12 text-center">
            <h3 className="text-xl font-semibold tui-text-primary mb-2">
              No Articles Found
            </h3>
            <p className="tui-text-muted">
              {reporterId
                ? "This reporter hasn't written any articles yet."
                : "No articles have been published yet."}
            </p>
          </div>
        ) : (
          articles.map((article) => (
            <ContentCard variant="tui" key={article.id} className="p-8">
              <div className="mb-4">
                <Link href={`/articles/${article.id}`} className="block group">
                  <h2 className="text-2xl font-bold tui-link mb-2">
                    {article.headline}
                  </h2>
                </Link>
                <div className="flex items-center tui-text-muted">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatDate(article.generationTime)}
                </div>
              </div>

              <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed whitespace-pre-wrap text-white/80">
                {article.body}
              </div>

              {/* Source Messages Section */}
              {article.messageTexts && article.messageTexts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--tui-border)]">
                  <ExpandableSection
                    title="Source Messages"
                    expanded={expandedMessages.has(article.id)}
                    onToggle={() => toggleMessages(article.id)}
                    variant="tui"
                  >
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold tui-text-primary">
                        Social Media Messages Used:
                      </h4>
                      {article.messageTexts.map((message, index) => (
                        <SourceMessageCard
                          key={index}
                          did={article.messageDids[index]}
                          rkey={article.messageRkeys[index]}
                          text={message}
                          variant="tui"
                        />
                      ))}
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {/* Prompt Section */}
              <div className="mt-6 pt-6 border-t border-[var(--tui-border)]">
                <ExpandableSection
                  title="Prompt"
                  expanded={expandedPrompts.has(article.id)}
                  onToggle={() => togglePrompt(article.id)}
                  variant="tui"
                >
                  <div className="border border-[var(--tui-border)] bg-black p-4">
                    <div className="flex items-center gap-2 mb-2 relative group">
                      <h4 className="text-sm font-semibold tui-text-primary">
                        AI Generation Prompt:
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
                          article. This allows the user to verify that no funny
                          business has taken place.
                        </div>
                      </div>
                    </div>
                    <pre className="text-xs text-[var(--tui-muted)] whitespace-pre-wrap font-mono leading-relaxed">
                      {article.prompt}
                    </pre>
                  </div>
                </ExpandableSection>
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--tui-border)]">
                <div className="flex items-center justify-between tui-text-muted">
                  <span>Article ID: {article.id}</span>
                  <span>Reporter: {article.reporterId}</span>
                </div>
              </div>
            </ContentCard>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-12">
        <p className="tui-text-muted">{appName} Articles</p>
      </div>
    </PageContainer>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense
      fallback={
        <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
            <p className="mt-4 tui-muted">Loading articles...</p>
          </div>
        </div>
      }
    >
      <ArticlesContent />
    </Suspense>
  );
}
