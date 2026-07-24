"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "../../components/PageContainer";
import ContentCard from "../../components/ContentCard";
import PageHeader from "../../components/PageHeader";
import EditionCard from "../../components/EditionCard";
import type { EditionCardEdition } from "../../components/EditionCard";
import { apiService } from "../services/api.service";
import { useList } from "@/hooks/useList";
import type { Article } from "../schemas/types";

function EditionsContent() {
  const searchParams = useSearchParams();
  const editionId = searchParams.get("id");
  const [singleEdition, setSingleEdition] = useState<EditionCardEdition | null>(
    null
  );
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState("");

  const {
    data: editionsData,
    loading,
    refetch: refetchEditions
  } = useList<EditionCardEdition>("/api/editions/latest");
  const [editions, setEditions] = useState<EditionCardEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [message, setMessage] = useState("");
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Newsroom";

  useEffect(() => {
    if (!editionId) return;
    setSingleLoading(true);
    setSingleError("");
    apiService
      .get<EditionCardEdition>(`/api/editions/${editionId}`)
      .then((data) => setSingleEdition(data))
      .catch((err) =>
        setSingleError(
          err instanceof Error ? err.message : "Failed to load edition"
        )
      )
      .finally(() => setSingleLoading(false));
  }, [editionId]);

  useEffect(() => {
    const loadEditions = async () => {
      if (!editionsData || editionsData.length === 0) return;

      setLoadingEditions(true);
      try {
        const fullEditions = await Promise.all(
          editionsData.map(
            async (edition: EditionCardEdition) =>
              await apiService.get<EditionCardEdition>(
                `/api/editions/${edition.id}`
              )
          )
        );

        setEditions(fullEditions);
      } catch (error) {
        setMessage("Error loading newspaper editions");
        console.error("Error fetching newspaper editions:", error);
      } finally {
        setLoadingEditions(false);
      }
    };
    loadEditions();
  }, [editionsData]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (editionId) {
    if (singleLoading) {
      return (
        <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
            <p className="mt-4 tui-muted">Loading edition...</p>
          </div>
        </div>
      );
    }

    if (singleError) {
      return (
        <PageContainer variant="tui">
          <ContentCard variant="tui" className="p-12 text-center">
            <h2 className="text-xl font-semibold text-[var(--tui-primary)] font-mono mb-4">
              Error Loading Edition
            </h2>
            <p className="tui-text-muted mb-6">{singleError}</p>
            <Link href="/editions" className="tui-btn inline-block">
              ← Back to Editions
            </Link>
          </ContentCard>
        </PageContainer>
      );
    }

    if (!singleEdition) return null;

    return (
      <PageContainer variant="tui" maxWidth="max-w-7xl">
        <ContentCard variant="tui" className="p-8 mb-8">
          <PageHeader
            variant="tui"
            title="Newspaper Edition"
            description={`Generated ${formatDate(singleEdition.generationTime)} — ${singleEdition.stories.length} stories`}
          >
            <Link href="/editions" className="tui-btn">
              ← Back to Editions
            </Link>
          </PageHeader>
        </ContentCard>

        <EditionCard
          edition={singleEdition}
          showArticles={true}
          collapsePrompt
        />

        <div className="text-center mt-12">
          <p className="tui-text-muted">{appName} Edition</p>
        </div>
      </PageContainer>
    );
  }

  if (loading || loadingEditions) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading editions...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Newspaper Editions"
          description="Browse the latest AI-generated newspaper editions"
        />
      </ContentCard>

      {message && (
        <div className="mb-6 tui-msg-error text-center">{message}</div>
      )}

      {editions.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold tui-text-primary mb-2">
            No Editions Available
          </h3>
          <p className="tui-text-muted">
            Newspaper editions are generated automatically. Check back later!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {editions.map((edition: EditionCardEdition) => {
            return (
              <EditionCard
                key={edition.id}
                edition={edition}
                showArticles={true}
                showEditionId
              />
            );
          })}
        </div>
      )}

      <div className="text-center mt-12">
        <p className="tui-text-muted">{appName} Edition Archive</p>
      </div>
    </PageContainer>
  );
}

export default function EditionsPage() {
  return (
    <Suspense
      fallback={
        <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
        </div>
      }
    >
      <EditionsContent />
    </Suspense>
  );
}
