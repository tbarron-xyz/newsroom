"use client";

import { useState, useEffect } from "react";
import PageContainer from "../../components/PageContainer";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import SourceArticleCard from "../../components/SourceArticleCard";
import { apiService } from "../services/api.service";
import type { Article } from "../schemas/types";

interface Topic {
  name: string;
  headline: string;
  newsStoryFirstParagraph: string;
  newsStorySecondParagraph: string;
  oneLineSummary: string;
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
  modelName: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

interface ColumnResult {
  label: string;
  content: DailyEdition;
}

const PAIR_METADATA = [
  {
    id: "israeli-media",
    name: "Israeli News Media Perspectives",
    leftLabel: "Israeli Centrist",
    rightLabel: "Palestinian / Arabic"
  },
  {
    id: "diplomatic-framings",
    name: "International Diplomatic Framings",
    leftLabel: "European Union",
    rightLabel: "US Republican / Neoconservative"
  },
  {
    id: "global-south",
    name: "Non-aligned / Global South Perspectives",
    leftLabel: "Indian Strategic",
    rightLabel: "South African / ANC"
  },
  {
    id: "domestic-political",
    name: "Domestic Political Perspectives Within Israel/Palestine",
    leftLabel: "Israeli Settler / Religious Zionist",
    rightLabel: "Palestinian Diaspora / NGO"
  }
];

function DailyEditionCard({
  edition,
  perspectiveLabel,
  articles
}: {
  edition: DailyEdition;
  perspectiveLabel: string;
  articles?: Article[];
}) {
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="border-b border-white/20 pb-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white/90">
              {edition.newspaperName || "Daily Edition"}
            </h2>
            <span className="text-sm text-white/70">
              {formatDate(edition.generationTime)}
            </span>
          </div>
          <span className="px-3 py-1 backdrop-blur-sm bg-white/10 border border-white/20 text-white/80 rounded-full text-xs font-medium mb-3 inline-block">
            {perspectiveLabel}
          </span>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight mt-3">
            {edition.frontPageHeadline}
          </h1>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {edition.frontPageArticle}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {edition.topics.map((topic, index) => (
          <div
            key={index}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl"
          >
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 backdrop-blur-sm bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white/80">
                    {index + 1}
                  </span>
                </div>
                <span className="px-3 py-1 backdrop-blur-sm bg-white/10 border border-white/20 text-white/80 rounded-full text-xs font-medium">
                  {topic.name}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-2">
                {topic.headline}
              </h3>
              <p className="text-sm text-white/70 italic">
                {topic.oneLineSummary}
              </p>
            </div>

            <div className="prose prose-lg max-w-none mb-6">
              <p className="text-white/80 leading-relaxed mb-4">
                {topic.newsStoryFirstParagraph}
              </p>
              <p className="text-white/80 leading-relaxed">
                {topic.newsStorySecondParagraph}
              </p>
            </div>
          </div>
        ))}
      </div>

      {articles && articles.length > 0 && (
        <div className="mt-8 pt-8 border-t border-white/20">
          <h3 className="text-lg font-bold text-white/90 mb-4">Source Articles</h3>
          {articles.map(article => <SourceArticleCard key={article.id} article={article} />)}
        </div>
      )}
    </div>
  );
}

export default function PrismPage() {
  const [dailyEditions, setDailyEditions] = useState<DailyEdition[]>([]);
  const [selectedPairId, setSelectedPairId] = useState(PAIR_METADATA[0].id);
  const [leftResult, setLeftResult] = useState<ColumnResult | null>(null);
  const [rightResult, setRightResult] = useState<ColumnResult | null>(null);
  const [leftArticles, setLeftArticles] = useState<Article[] | undefined>(undefined);
  const [rightArticles, setRightArticles] = useState<Article[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [remapping, setRemapping] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEditions = async () => {
      try {
        const data =
          await apiService.get<DailyEdition[]>("/api/daily-editions");
        setDailyEditions(data);
      } catch (err) {
        setError("Failed to load daily editions");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEditions();
  }, []);

  const handleRemap = async () => {
    if (dailyEditions.length === 0) return;
    setRemapping(true);
    setError("");
    setLeftResult(null);
    setRightResult(null);
    try {
      const result = await apiService.post<{
        left: ColumnResult;
        right: ColumnResult;
      }>("/api/prism", {
        dailyEditionId: dailyEditions[0].id,
        pairId: selectedPairId
      });
      setLeftResult(result.left);
      setRightResult(result.right);

      // Fetch enriched source articles for both perspectives
      const [leftEnriched, rightEnriched] = await Promise.all([
        apiService.get<any>(`/api/daily-editions/${result.left.content.id}`).catch(() => null),
        apiService.get<any>(`/api/daily-editions/${result.right.content.id}`).catch(() => null),
      ]);
      if (leftEnriched) {
        setLeftArticles(leftEnriched.editions.flatMap((e: any) => e.stories));
      }
      if (rightEnriched) {
        setRightArticles(rightEnriched.editions.flatMap((e: any) => e.stories));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during remapping"
      );
      console.error(err);
    } finally {
      setRemapping(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner message="Loading..." />
      </PageContainer>
    );
  }

  if (dailyEditions.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={
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
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18"
              />
            </svg>
          }
          title="No Daily Editions Available"
          description="Daily editions are generated automatically. Check back later!"
        />
      </PageContainer>
    );
  }

  const selectedPair = PAIR_METADATA.find((p) => p.id === selectedPairId)!;

  return (
    <PageContainer maxWidth="max-w-7xl">
      <PageHeader
        title="Perspective Prism"
        description="Rewrite a daily edition through paired editorial lenses for side-by-side comparison"
      />

      {/* Pair selector */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl mb-6">
        <h2 className="text-lg font-semibold text-white/90 mb-4">
          Select Perspective Pair
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAIR_METADATA.map((pair) => (
            <button
              key={pair.id}
              onClick={() => {
                setSelectedPairId(pair.id);
                setLeftResult(null);
                setRightResult(null);
              }}
              className={`p-4 backdrop-blur-sm rounded-xl transition-all duration-300 text-left ${
                selectedPairId === pair.id
                  ? "bg-white/20 border-2 border-white/30 text-white"
                  : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              }`}
            >
              <div className="font-medium text-sm mb-2">{pair.name}</div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {pair.leftLabel}
                </span>
                <span className="text-white/40">vs</span>
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300">
                  {pair.rightLabel}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Remap button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleRemap}
          disabled={remapping}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 shadow-lg"
        >
          {remapping ? "Remapping..." : "Remap"}
        </button>
        {error && (
          <div className="px-4 py-3 backdrop-blur-sm rounded-xl text-sm font-medium bg-red-500/20 border border-red-500/30 text-red-200 flex-1">
            {error}
          </div>
        )}
      </div>

      {/* Two-column results */}
      {leftResult && rightResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400" />
                {leftResult.label}
              </div>
              <DailyEditionCard
                edition={leftResult.content}
                perspectiveLabel={leftResult.label}
                articles={leftArticles}
              />
            </div>
            <div>
              <div className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-400" />
                {rightResult.label}
              </div>
              <DailyEditionCard
                edition={rightResult.content}
                perspectiveLabel={rightResult.label}
                articles={rightArticles}
              />
            </div>
          </div>

          {/* Prompt disclosure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white/90 mb-4">
                Prompt — {leftResult.label}
              </h2>
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {leftResult.content.prompt}
              </div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white/90 mb-4">
                Prompt — {rightResult.label}
              </h2>
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {rightResult.content.prompt}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
