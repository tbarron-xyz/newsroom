"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SourceArticleCard from "../components/SourceArticleCard";
import { apiService } from "@/app/services/api.service";
import type { Article } from "./schemas/types";

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

interface PrismDailyEditionPair {
  id: string;
  generationTime: number;
  leftLabel: string;
  rightLabel: string;
  left: DailyEdition;
  right: DailyEdition;
  sourcePrompt: string;
  leftPrompt: string;
  rightPrompt: string;
}

function EditionCard({ edition, label, dotColor }: { edition: DailyEdition; label: string; dotColor: string }) {
  return (
    <div className="space-y-8">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${dotColor}`} />
          <h2 className="text-xl font-bold text-white/90">{label}</h2>
        </div>
        <div className="border-b border-white/20 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            {edition.frontPageHeadline}
          </h1>
          <span className="text-sm text-white/70">
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
        <div className="prose prose-lg max-w-none">
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {edition.frontPageArticle}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white/90">Stories</h3>
        {edition.topics.map((topic, index) => (
          <div
            key={index}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl"
          >
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 backdrop-blur-sm bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white/80">{index + 1}</span>
                </div>
                <span className="px-3 py-1 backdrop-blur-sm bg-white/10 border border-white/20 text-white/80 rounded-full text-xs font-medium">
                  {topic.name}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-2">{topic.headline}</h3>
              <p className="text-sm text-white/70 italic">{topic.oneLineSummary}</p>
            </div>
            <div className="prose prose-lg max-w-none mb-6">
              <p className="text-white/80 leading-relaxed mb-4">{topic.newsStoryFirstParagraph}</p>
              <p className="text-white/80 leading-relaxed">{topic.newsStorySecondParagraph}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromptDisclosure({
  sourcePrompt,
  leftPrompt,
  rightPrompt,
  leftLabel,
  rightLabel
}: {
  sourcePrompt: string;
  leftPrompt: string;
  rightPrompt: string;
  leftLabel: string;
  rightLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-white/90">Prompt Disclosure</h2>
        <svg
          className={`w-5 h-5 text-white/70 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white/90 mb-2">Source Analysis Prompt</h3>
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {sourcePrompt}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-300 mb-2">{leftLabel} — Editorial Prompt</h3>
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {leftPrompt}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-green-300 mb-2">{rightLabel} — Editorial Prompt</h3>
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {rightPrompt}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [dailyEditions, setDailyEditions] = useState<DailyEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState<DailyEdition | null>(null);
  const [enrichedData, setEnrichedData] = useState<EnrichedDailyEdition | null>(null);
  const [message, setMessage] = useState("");

  const [prismPairs, setPrismPairs] = useState<PrismDailyEditionPair[]>([]);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [prismLoading, setPrismLoading] = useState(true);
  const [usePrismView, setUsePrismView] = useState(false);

  const [appName, setAppName] = useState("");
  const [appFullName, setAppFullName] = useState("");

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await apiService.get<{ app: { name: string; fullName: string } }>("/api/config");
        setAppName(config.app.name);
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
      const pairs = await apiService.get<PrismDailyEditionPair[]>("/api/prism-daily-editions");
      if (pairs.length > 0) {
        setPrismPairs(pairs);
        setUsePrismView(true);
      } else {
        const data = await apiService.get<DailyEdition[]>("/api/daily-editions");
        setDailyEditions(data);
        if (data.length > 0) {
          setSelectedEdition(data[0]);
        }
        setUsePrismView(false);
      }
    } catch (error) {
      try {
        const data = await apiService.get<DailyEdition[]>("/api/daily-editions");
        setDailyEditions(data);
        if (data.length > 0) {
          setSelectedEdition(data[0]);
        }
        setUsePrismView(false);
      } catch (e) {
        setMessage("Error loading editions");
        console.error("Error fetching editions:", e);
      }
    } finally {
      setLoading(false);
      setPrismLoading(false);
    }
  };

  const formatDateShort = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  };

  if (loading || prismLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse duration-3000" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse duration-3000 delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse duration-3000 delay-500" />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 relative z-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        {message && (
          <div className="mb-6 px-6 py-4 backdrop-blur-sm rounded-xl text-center font-medium bg-red-500/20 border border-red-500/30 text-red-200">
            {message}
          </div>
        )}

        {usePrismView && prismPairs.length > 0 ? (
          <>
            {(() => {
              const pair = prismPairs[selectedPairIndex];
              if (!pair) return null;
              return (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <EditionCard edition={pair.left} label={pair.leftLabel} dotColor="bg-blue-400" />
                    <EditionCard edition={pair.right} label={pair.rightLabel} dotColor="bg-green-400" />
                  </div>

                  {prismPairs.length > 1 && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                      <h3 className="text-sm font-semibold text-white/70 mb-3 text-center">Earlier Editions</h3>
                      <div className="flex justify-center gap-3">
                        {prismPairs.map((p, i) => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPairIndex(i)}
                            className={`px-4 py-2 backdrop-blur-sm rounded-xl text-sm transition-all duration-300 ${
                              selectedPairIndex === i
                                ? "bg-white/20 border-2 border-white/30 text-white"
                                : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            {formatDateShort(p.generationTime)} — {p.leftLabel} vs {p.rightLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <PromptDisclosure
                    sourcePrompt={pair.sourcePrompt}
                    leftPrompt={pair.leftPrompt}
                    rightPrompt={pair.rightPrompt}
                    leftLabel={pair.leftLabel}
                    rightLabel={pair.rightLabel}
                  />
                </div>
              );
            })()}
          </>
        ) : dailyEditions.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center shadow-2xl">
            <div className="w-16 h-16 backdrop-blur-sm bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/90 mb-2">No Daily Editions Available</h3>
            <p className="text-white/70">Daily editions are generated automatically. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-white/90 mb-4">Available Editions</h2>
                <div className="space-y-2">
                  {dailyEditions.map((edition) => (
                    <button
                      key={edition.id}
                      onClick={() => setSelectedEdition(edition)}
                      className={`w-full text-left px-4 py-3 backdrop-blur-sm rounded-xl transition-all duration-300 ${
                        selectedEdition?.id === edition.id
                          ? "bg-white/20 border-2 border-white/30 text-white"
                          : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-medium text-sm">{edition.newspaperName || "Daily Edition"}</div>
                      <div className="text-xs text-white/60 mt-1">
                        {new Date(edition.generationTime).toLocaleDateString("en-US", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                      <div className="text-xs text-white/60">{edition.topics.length} topics</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {selectedEdition && (
                <div className="space-y-8">
                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                    <div className="border-b border-white/20 pb-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white/90">{selectedEdition.newspaperName || "Daily Edition"}</h2>
                        <span className="text-sm text-white/70">
                          {new Date(selectedEdition.generationTime).toLocaleDateString("en-US", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-white mb-4 leading-tight">{selectedEdition.frontPageHeadline}</h1>
                    </div>
                    <div className="prose prose-lg max-w-none">
                      <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{selectedEdition.frontPageArticle}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white/90">Today's Stories</h2>
                    {selectedEdition.topics.map((topic, index) => (
                      <div key={index} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                        <div className="mb-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 backdrop-blur-sm bg-white/20 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-white/80">{index + 1}</span>
                            </div>
                            <span className="px-3 py-1 backdrop-blur-sm bg-white/10 border border-white/20 text-white/80 rounded-full text-xs font-medium">{topic.name}</span>
                          </div>
                          <h3 className="text-xl font-bold text-white/90 mb-2">{topic.headline}</h3>
                          <p className="text-sm text-white/70 italic">{topic.oneLineSummary}</p>
                        </div>
                        <div className="prose prose-lg max-w-none mb-6">
                          <p className="text-white/80 leading-relaxed mb-4">{topic.newsStoryFirstParagraph}</p>
                          <p className="text-white/80 leading-relaxed">{topic.newsStorySecondParagraph}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {enrichedData && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                      <h2 className="text-xl font-bold text-white/90 mb-6">Source Articles</h2>
                      <div className="space-y-4">
                        {enrichedData.editions.flatMap(e => e.stories).map((article) => (
                          <SourceArticleCard key={article.id} article={article} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center gap-2 mb-6 relative group">
                      <h2 className="text-xl font-bold text-white/90">Generation Prompt</h2>
                      <div className="relative group">
                        <svg className="w-4 h-4 text-white/60 hover:text-white/80 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          To ensure full journalistic transparency, this is the exact prompt given to the AI model to generate this daily edition.
                        </div>
                      </div>
                    </div>
                    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/70 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {selectedEdition.prompt}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-12 text-white/50">
          <p>{appFullName} Daily Edition Reader</p>
        </div>
      </div>
    </div>
  );
}
