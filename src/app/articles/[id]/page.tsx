"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import ExpandableSection from "@/components/ExpandableSection";
import SourceMessageCard from "@/components/SourceMessageCard";
import { apiService } from "@/app/services/api.service";
import { useAuth } from "@/contexts/AuthContext";
import { useReporterLookup } from "@/hooks/useReporterLookup";

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

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;
  const { user } = useAuth();
  const reporterLookup = useReporterLookup();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Newsroom";
  const [deleting, setDeleting] = useState(false);

  const hasEditorPermission = user?.hasEditor === true;

  const fetchArticle = useCallback(async () => {
    try {
      const data = await apiService.get<Article>(`/api/articles/${articleId}`);
      setArticle(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        setError("Article not found");
      } else {
        setError("Error loading article");
        console.error("Error fetching article:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId, fetchArticle]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiService.delete(`/api/articles/${articleId}`);
      router.push("/articles");
    } catch (error) {
      console.error("Error deleting article:", error);
      setDeleting(false);
    }
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
              Error Loading Article
            </h2>
            <p className="tui-muted">{error}</p>
            <Link href="/articles" className="tui-btn inline-block mt-4">
              ← Back to Articles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Article Details"
          description={`Reporter ${reporterLookup.get(article.reporterId) || article.reporterId}`}
        >
          <Link
            href={`/articles?reporterId=${article.reporterId}`}
            className="tui-btn"
          >
            ← Back to Articles
          </Link>
          {hasEditorPermission && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="tui-btn-danger px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </PageHeader>
      </ContentCard>

      {/* Article Content */}
      <ContentCard variant="tui" className="p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tui-text-primary mb-4 leading-tight">
            {article.headline}
          </h2>
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

        <div className="mb-8">
          <div className="tui-text-muted leading-relaxed whitespace-pre-wrap">
            {article.body}
          </div>
        </div>

        {/* Message Texts Section */}
        {article.messageTexts && article.messageTexts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-[var(--tui-border)]">
            <ExpandableSection
              title="Source Messages"
              expanded={showMessages}
              onToggle={() => setShowMessages(!showMessages)}
              variant="tui"
            >
              <div className="space-y-4">
                <h4 className="text-sm font-semibold tui-text-primary">
                  Social Media Messages Used:
                </h4>
                {article.messageTexts.map((message, index) => (
                  <SourceMessageCard
                    key={index}
                    did={article.messageDids?.[index] ?? ""}
                    rkey={article.messageRkeys?.[index] ?? ""}
                    text={message}
                    variant="tui"
                  />
                ))}
              </div>
            </ExpandableSection>
          </div>
        )}

        {/* Prompt Section */}
        <div className="mt-8 pt-8 border-t border-[var(--tui-border)]">
          <ExpandableSection
            title="Prompt"
            expanded={showPrompt}
            onToggle={() => setShowPrompt(!showPrompt)}
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
                    To ensure full journalistic transparency, this is the exact
                    prompt given to the AI model to generate this article. This
                    allows the user to verify that no funny business has taken
                    place.
                  </div>
                </div>
              </div>
              <pre className="text-xs text-[var(--tui-muted)] whitespace-pre-wrap font-mono leading-relaxed">
                {article.prompt}
              </pre>
            </div>
          </ExpandableSection>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--tui-border)]">
          <div className="flex items-center justify-between tui-text-muted">
            <span>Article ID: {article.id}</span>
            <span>
              Reporter:{" "}
              {reporterLookup.get(article.reporterId) || article.reporterId}
            </span>
          </div>
        </div>
      </ContentCard>

      {/* Footer */}
      <div className="text-center mt-12">
        <p className="tui-text-muted">{appName} Article</p>
      </div>
    </PageContainer>
  );
}
