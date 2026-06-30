"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import LoadingSpinner from "@/components/LoadingSpinner";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import GradientButton from "@/components/GradientButton";
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
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="text-center relative z-10">
          <div className="w-16 h-16 backdrop-blur-xl bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white/90 mb-2">
            Error Loading Articles
          </h2>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <ContentCard className="p-8 mb-8">
        <PageHeader
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
            <Link
              href="/reporters"
              className="relative px-6 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl font-medium text-white/90 hover:bg-white/20 transition-all duration-300"
            >
              ← Back to Reporters
            </Link>
          ) : (
            <Link
              href="/"
              className="relative px-6 py-3 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl font-medium text-white/90 hover:bg-white/20 transition-all duration-300"
            >
              ← Back to Daily Edition
            </Link>
          )}
        </PageHeader>
      </ContentCard>

      {/* Articles List */}
      <div className="space-y-6">
        {articles.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center shadow-2xl">
            <div className="w-16 h-16 backdrop-blur-sm bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/90 mb-2">
              No Articles Found
            </h3>
            <p className="text-white/70">
              {reporterId
                ? "This reporter hasn't written any articles yet."
                : "No articles have been published yet."}
            </p>
          </div>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300"
            >
              <div className="mb-4">
                <Link href={`/articles/${article.id}`} className="block group">
                  <h2 className="text-2xl font-bold text-white/90 mb-2 group-hover:text-white transition-colors">
                    {article.headline}
                  </h2>
                </Link>
                <div className="flex items-center text-sm text-white/70">
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

              <div className="prose prose-slate max-w-none">
                <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                  {article.body}
                </p>
              </div>

              {/* Source Messages Section */}
              {article.messageTexts && article.messageTexts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <ExpandableSection
                    title="Source Messages"
                    expanded={expandedMessages.has(article.id)}
                    onToggle={() => toggleMessages(article.id)}
                  >
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white/90">
                        Social Media Messages Used:
                      </h4>
                      {article.messageTexts.map((message, index) => (
                        <SourceMessageCard
                          key={index}
                          did={article.messageDids[index]}
                          rkey={article.messageRkeys[index]}
                          text={message}
                        />
                      ))}
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {/* Prompt Section */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <ExpandableSection
                  title="Prompt"
                  expanded={expandedPrompts.has(article.id)}
                  onToggle={() => togglePrompt(article.id)}
                >
                  <div className="p-4 backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 relative group">
                      <h4 className="text-sm font-semibold text-white/90">
                        AI Generation Prompt:
                      </h4>
                      <div className="relative group">
                        <svg
                          className="w-4 h-4 text-white/60 hover:text-white/80 cursor-help"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          To ensure full journalistic transparency, this is the
                          exact prompt given to the AI model to generate this
                          article. This allows the user to verify that no funny
                          business has taken place.
                        </div>
                      </div>
                    </div>
                    <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
                      {article.prompt}
                    </pre>
                  </div>
                </ExpandableSection>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Article ID: {article.id}</span>
                  <span>Reporter: {article.reporterId}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-white/50">
        <p>{appName} Articles</p>
      </div>
    </PageContainer>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ArticlesContent />
    </Suspense>
  );
}
