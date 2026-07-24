"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "../../components/PageContainer";
import ContentCard from "../../components/ContentCard";
import DailyEditionFullView from "../components/DailyEditionFullView";
import { apiService } from "@/app/services/api.service";
import type { Article, DailyEdition } from "../schemas/types";

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

function DailyEditionContent() {
  const searchParams = useSearchParams();
  const editionIdParam = searchParams.get("id");
  const [dailyEditions, setDailyEditions] = useState<DailyEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState<DailyEdition | null>(
    null
  );
  const [enrichedData, setEnrichedData] = useState<EnrichedDailyEdition | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [standaloneData, setStandaloneData] = useState<{
    edition: DailyEdition;
    enriched: EnrichedDailyEdition;
  } | null>(null);
  const [standaloneLoading, setStandaloneLoading] = useState(false);

  const appFullName = process.env.NEXT_PUBLIC_APP_FULL_NAME || "attonews";

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    if (dailyEditions.length > 0 && editionIdParam) {
      const match = dailyEditions.find((e) => e.id === editionIdParam);
      if (match) {
        setStandaloneData(null);
        setSelectedEdition(match);
      } else if (!standaloneData) {
        setStandaloneLoading(true);
        apiService
          .get<EnrichedDailyEdition>(`/api/daily-editions/${editionIdParam}`)
          .then((data) => {
            setStandaloneData({
              edition: data as unknown as DailyEdition,
              enriched: data
            });
          })
          .catch((err) => {
            setMessage(
              err instanceof Error ? err.message : "Failed to load edition"
            );
          })
          .finally(() => setStandaloneLoading(false));
      }
    }
  }, [editionIdParam, dailyEditions, standaloneData]);

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
        if (editionIdParam) {
          const match = data.find((e) => e.id === editionIdParam);
          if (match) {
            setSelectedEdition(match);
          } else {
            setSelectedEdition(data[0]);
          }
        } else {
          setSelectedEdition(data[0]);
        }
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

  const isStandalone = standaloneData !== null;
  const displayEdition = isStandalone
    ? standaloneData.edition
    : selectedEdition;
  const displayEnriched = isStandalone ? standaloneData.enriched : enrichedData;

  if (loading || standaloneLoading) {
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

      {dailyEditions.length === 0 && !isStandalone ? (
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
                    onClick={() => {
                      setStandaloneData(null);
                      setSelectedEdition(edition);
                    }}
                    className={`w-full text-left px-4 py-3 transition-all duration-300 ${
                      !isStandalone && selectedEdition?.id === edition.id
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
            {displayEdition && (
              <DailyEditionFullView
                edition={displayEdition}
                enrichedData={displayEnriched}
              />
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

export default function DailyEditionPage() {
  return (
    <Suspense
      fallback={
        <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
        </div>
      }
    >
      <DailyEditionContent />
    </Suspense>
  );
}
