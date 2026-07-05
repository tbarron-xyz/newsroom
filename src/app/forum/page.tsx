"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "../services/api.service";
import { useList } from "@/hooks/useList";

interface LatestThread {
  id: number;
  title: string;
  replyCount: number;
  lastReplyTime: number;
}

interface Forum {
  id: string;
  title: string;
  description: string;
  threadCount: number;
  postCount: number;
  latestThread: LatestThread | null;
}

interface Section {
  id: string;
  title: string;
  forums: Forum[];
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

export default function ForumPage() {
  const {
    data: sections,
    loading,
    error,
    refetch
  } = useList<Section>("/api/forum");
  const router = useRouter();

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading forum...</p>
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
              Error Loading Forum
            </h2>
            <p className="tui-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title="Forum"
          description="Discussion forums organized by topic"
        />
      </ContentCard>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.id} className="tui-section-card">
            <div className="tui-section-card-header">
              <h2 className="text-xl font-bold tui-text-primary">
                {section.title}
              </h2>
            </div>

            <div className="divide-y divide-[var(--tui-border)]">
              {section.forums.map((forum) => (
                <div key={forum.id} className="tui-section-card-item">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/forum/${forum.id}`}
                        className="text-lg font-semibold tui-link"
                      >
                        {forum.title}
                      </Link>
                      <p className="tui-text-muted mt-1">{forum.description}</p>
                      <div
                        className="flex items-center gap-4 mt-2 tui-text-muted"
                        style={{ fontSize: "0.75rem" }}
                      >
                        <span>{forum.threadCount} threads</span>
                        <span>{forum.postCount} posts</span>
                      </div>
                    </div>

                    {forum.latestThread && (
                      <div className="text-right max-w-xs">
                        <Link
                          href={`/thread/${forum.latestThread.id}`}
                          className="block text-sm tui-link line-clamp-1"
                        >
                          {forum.latestThread.title}
                        </Link>
                        <div
                          className="flex items-center justify-end gap-2 mt-1 tui-text-muted"
                          style={{ fontSize: "0.75rem" }}
                        >
                          <span>{forum.latestThread.replyCount} replies</span>
                          <span>•</span>
                          <span>
                            {formatTime(forum.latestThread.lastReplyTime)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
