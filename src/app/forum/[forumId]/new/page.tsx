"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import FormInput from "@/components/FormInput";
import { apiService } from "@/app/services/api.service";

export default function NewThreadPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReader, setHasReader] = useState(false);
  const router = useRouter();
  const params = useParams();
  const forumId = params.forumId as string;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    checkReaderPermission(token);
  }, [router]);

  const checkReaderPermission = async (token: string) => {
    try {
      const data = await apiService.get<{ hasReader: boolean }>(
        "/api/abilities/reader"
      );
      setHasReader(data.hasReader);
    } catch (err) {
      console.error("Failed to check reader permission", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const data = await apiService.post<{ threadId: number }>(
        `/api/forum/${forumId}/thread`,
        { title: subject, content: body }
      );
      router.push(`/thread/${data.threadId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create thread");
      setSubmitting(false);
    }
  };

  if (!hasReader) {
    return (
      <PageContainer variant="tui">
        <ContentCard variant="tui" className="p-8">
          <h2 className="text-xl font-semibold text-[var(--tui-primary)] font-mono mb-2">
            Permission Required
          </h2>
          <p className="tui-muted mb-4">
            You need reader permission to create a new thread.
          </p>
          <Link href={`/forum/${forumId}`} className="tui-link">
            ← Back to Forum
          </Link>
        </ContentCard>
      </PageContainer>
    );
  }

  const forumTitles: Record<string, string> = {
    announcements: "Announcements",
    general: "General",
    suggestions: "Suggestions",
    content: "Content",
    sources: "Sources",
    methods: "Methods",
    history: "History",
    prehistory: "Prehistory",
    speculation: "Speculation",
    music: "Music",
    "movies-tv": "Movies & TV",
    technology: "Technology",
    politics: "Politics",
    "the-internet": "The Internet"
  };

  const forumTitle = forumTitles[forumId] || forumId;

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader variant="tui" title="New Thread" description={forumTitle}>
          <Link href={`/forum/${forumId}`} className="tui-btn">
            ← Back to Forum
          </Link>
        </PageHeader>
      </ContentCard>

      <form onSubmit={handleSubmit}>
        <ContentCard variant="tui" className="p-6">
          <div className="space-y-6">
            <FormInput
              variant="tui"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter thread subject..."
              maxLength={200}
              required
            />
            <span className="tui-text-muted" style={{ fontSize: "0.75rem" }}>
              {subject.length}/200 characters
            </span>

            <div className="space-y-2">
              <label className="tui-label block mb-2">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter thread content..."
                maxLength={4096}
                rows={8}
                required
                className="tui-textarea"
              />
              <span className="tui-text-muted" style={{ fontSize: "0.75rem" }}>
                {body.length}/4096 characters
              </span>
            </div>

            {error && (
              <div className="border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)] p-4">
                <p className="tui-text-muted">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !subject.trim() || !body.trim()}
                className="tui-btn-primary"
              >
                {submitting ? "Creating..." : "Create Thread"}
              </button>
            </div>
          </div>
        </ContentCard>
      </form>
    </PageContainer>
  );
}
