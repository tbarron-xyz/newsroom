"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "@/app/services/api.service";

interface ReplyOption {
  threadId: number;
  threadTitle: string;
  replies: string[];
  personaDisplay: string;
}

export interface PersonaInfo {
  key: string;
  display: string;
  description: string;
  color?: string;
}

export default function ActAsPage() {
  const [personas, setPersonas] = useState<PersonaInfo[]>([]);
  const [selectedPersonaKey, setSelectedPersonaKey] = useState<string>("");
  const [currentPersonaDisplay, setCurrentPersonaDisplay] =
    useState<string>("");
  const [replyOptions, setReplyOptions] = useState<ReplyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const forumId = params.forumId as string;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchPersonas();
  }, [router, forumId]);

  const fetchPersonas = async () => {
    try {
      const data = await apiService.get<{
        classic: Record<string, any>;
        dynamic: any[];
      }>("/api/personas");
      const classicPersonas = Object.entries(data.classic || {}).map(
        ([key, val]: [string, any]) => ({
          key,
          display: val.display || key,
          description: val.description || "",
          color: val.color
        })
      ) as PersonaInfo[];

      const dynamicPersonas = (data.dynamic || []).map((p: any) => ({
        key: p.display,
        display: p.display,
        description: p.description || "",
        color: p.color
      })) as PersonaInfo[];

      const allPersonas = [...classicPersonas, ...dynamicPersonas];
      setPersonas(allPersonas);
      if (allPersonas.length > 0) {
        const firstKey = allPersonas[0].key;
        setSelectedPersonaKey(firstKey);
        setCurrentPersonaDisplay(allPersonas[0].display);
        fetchReplyOptions(firstKey);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load personas");
      setLoading(false);
    }
  };

  const fetchReplyOptions = async (personaKey: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiService.get<{
        threadTitles: string[];
        threadIds?: number[];
        replies: string[][];
      }>(
        `/api/forum/${forumId}/act-as?persona=${encodeURIComponent(personaKey)}`
      );
      const personaInfo = personas.find(
        (p: PersonaInfo) => p.key === personaKey
      );
      const display = personaInfo?.display || personaKey;
      setCurrentPersonaDisplay(display);
      const formatted = data.threadTitles.map((title: string, i: number) => ({
        threadId: data.threadIds ? data.threadIds[i] : i,
        threadTitle: title,
        replies: data.replies[i] || [],
        personaDisplay: display
      }));
      setReplyOptions(formatted);
    } catch (err: any) {
      setError(err.message || "Failed to generate reply options");
      setReplyOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReply = async (threadId: number, replyText: string) => {
    if (!selectedPersonaKey || !replyText) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiService.post<{ threadId: number }>(
        `/api/forum/${forumId}/act-as`,
        {
          persona: selectedPersonaKey,
          replyText,
          threadIndex: replyOptions.findIndex((r) => r.threadId === threadId)
        }
      );
      setSuccess("Reply posted successfully!");
      // Redirect to thread
      setTimeout(() => router.push(`/thread/${data.threadId}`), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && personas.length === 0) {
    return (
      <PageContainer variant="tui">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Act as Forum User"
          description="Generate authentic replies as different forum personas"
        >
          <Link href={`/forum/${forumId}`} className="tui-btn">
            ← Back to Forum
          </Link>
        </PageHeader>
      </ContentCard>

      <ContentCard variant="tui" className="p-6 mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="tui-label">Select Persona:</label>
            <button
              onClick={() => fetchReplyOptions(selectedPersonaKey)}
              disabled={loading || !selectedPersonaKey}
              className="tui-btn"
            >
              ↻ Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 border border-[var(--tui-border)] max-h-72 overflow-y-auto">
            {personas.map((persona) => (
              <button
                key={persona.key}
                onClick={() => {
                  setSelectedPersonaKey(persona.key);
                  fetchReplyOptions(persona.key);
                }}
                className={`p-3 border border-[var(--tui-border)] text-left transition-all duration-200 hover:bg-[var(--tui-hover-bg)]
                  ${
                    selectedPersonaKey === persona.key
                      ? `border-[var(--tui-primary)] bg-[var(--tui-hover-bg)]`
                      : "bg-[var(--tui-bg)]"
                  }`}
              >
                <div className="font-bold text-lg leading-tight mb-1 tui-text-primary">
                  {persona.display}
                </div>
                <div className="tui-text-muted leading-tight line-clamp-2">
                  {persona.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </ContentCard>

      {error && (
        <ContentCard variant="tui" className="mt-6 p-4 border border-[#ff3333]">
          <p className="tui-text-muted">{error}</p>
        </ContentCard>
      )}

      {success && (
        <ContentCard
          variant="tui"
          className="mt-6 p-4 border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)]"
        >
          <p className="tui-text-primary">{success}</p>
        </ContentCard>
      )}

      {replyOptions.length === 0 && !loading && !error ? (
        <ContentCard variant="tui" className="p-8">
          <p className="text-center tui-muted">
            No threads available in this forum to generate replies for.
          </p>
        </ContentCard>
      ) : (
        <div className="space-y-8">
          {replyOptions.map((option, idx) => (
            <ContentCard variant="tui" key={idx} className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <Link
                  href={`/thread/${option.threadId}`}
                  className="text-xl font-semibold tui-link"
                >
                  {option.threadTitle}
                </Link>
                <span className="tui-text-muted text-sm font-medium">
                  {option.personaDisplay}
                </span>
              </div>

              <div className="space-y-4">
                {option.replies.map((reply, rIdx) => (
                  <div
                    key={rIdx}
                    className="border border-[var(--tui-border)] p-5"
                  >
                    <div className="text-[var(--tui-primary)] font-mono text-[15px] leading-relaxed mb-4">
                      {reply}
                    </div>
                    <button
                      onClick={() => handlePostReply(option.threadId, reply)}
                      disabled={submitting}
                      className="tui-btn text-xs"
                    >
                      {submitting
                        ? "Posting..."
                        : "Post as " + option.personaDisplay}
                    </button>
                  </div>
                ))}
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
