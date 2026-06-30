"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ExpandableSection from "@/components/ExpandableSection";
import SourceMessageCard from "@/components/SourceMessageCard";
import { apiService } from "@/app/services/api.service";

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
  const articleId = params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [appName, setAppName] = useState("Newsroom");

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

  // Load app configuration
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center relative overflow-hidden">
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
            Error Loading Article
          </h2>
          <p className="text-white/70">{error}</p>
          <Link
            href="/articles"
            className="mt-4 inline-block px-6 py-3 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-colors font-medium"
          >
            ← Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white/90 mb-2">
              Article Details
            </h1>
            <p className="text-white/70 text-lg">
              Reporter {article.reporterId.split("_")[2] || article.reporterId}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href={`/articles?reporterId=${article.reporterId}`}
              className="px-6 py-3 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-colors font-medium"
            >
              ← Back to Articles
            </Link>
          </div>
        </div>

        {/* Article Content */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white/90 mb-4 leading-tight">
              {article.headline}
            </h2>
            <div className="flex items-center text-sm text-white/60">
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
            <div className="text-white/80 leading-relaxed whitespace-pre-wrap text-lg">
              {article.body}
            </div>
          </div>

          {/* Message Texts Section */}
          {article.messageTexts && article.messageTexts.length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/20">
              <ExpandableSection
                title="Source Messages"
                expanded={showMessages}
                onToggle={() => setShowMessages(!showMessages)}
              >
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white/80">
                    Social Media Messages Used:
                  </h4>
                  {article.messageTexts.map((message, index) => (
                    <SourceMessageCard
                      key={index}
                      did={article.messageDids?.[index] ?? ""}
                      rkey={article.messageRkeys?.[index] ?? ""}
                      text={message}
                    />
                  ))}
                </div>
              </ExpandableSection>
            </div>
          )}

          {/* Prompt Section */}
          <div className="mt-8 pt-8 border-t border-white/20">
            <ExpandableSection
              title="Prompt"
              expanded={showPrompt}
              onToggle={() => setShowPrompt(!showPrompt)}
            >
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2 relative group">
                  <h4 className="text-sm font-semibold text-white/80">
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

          <div className="mt-8 pt-8 border-t border-white/20">
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>Article ID: {article.id}</span>
              <span>Reporter: {article.reporterId}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/50">
          <p>{appName} Article</p>
        </div>
      </div>
    </div>
  );
}
