"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "../../services/api.service";

interface Thread {
  id: number;
  title: string;
  replyCount: number;
  lastReplyTime: number;
  author: string;
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
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

export default function ForumViewPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchThreads();
    checkReaderPermission();
  }, [router, forumId]);

  const checkReaderPermission = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const data = await apiService.get<{ hasReader: boolean }>(
        "/api/abilities/reader"
      );
      setHasReader(data.hasReader);
    } catch (err) {
      console.error("Failed to check reader permission", err);
    }
  };

  const fetchThreads = async () => {
    try {
      const data = await apiService.get<Thread[]>(`/api/forum/${forumId}`);
      setThreads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load threads");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading threads...</p>
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
              Error Loading Threads
            </h2>
            <p className="tui-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const forumTitle = forumTitles[forumId] || forumId;

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title={forumTitle}
          description={`${threads.length} threads`}
        >
          <Link href="/forum" className="tui-btn">
            ← Back to Forum
          </Link>
          {hasReader && (
            <Link href={`/forum/${forumId}/new`} className="tui-btn-primary">
              + New Thread
            </Link>
          )}
          {hasReader && (
            <Link href={`/forum/${forumId}/act-as`} className="tui-btn">
              Act as forum user
            </Link>
          )}
        </PageHeader>
      </ContentCard>

      <div className="tui-section-card">
        <div className="divide-y divide-[var(--tui-border)]">
          {threads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="tui-muted">No threads yet</p>
            </div>
          ) : (
            threads.map((thread) => (
              <div key={thread.id} className="tui-section-card-item">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/thread/${thread.id}`}
                      className="text-lg font-semibold tui-link"
                    >
                      {thread.title}
                    </Link>
                    <div
                      className="flex items-center gap-2 mt-2 tui-text-muted"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <span>by {thread.author}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="flex items-center gap-3 tui-text-muted"
                      style={{ fontSize: "0.875rem" }}
                    >
                      <span>{thread.replyCount} replies</span>
                      <span className="tui-text-muted" style={{ opacity: 0.7 }}>
                        {formatTime(thread.lastReplyTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
