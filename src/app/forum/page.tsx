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
  const { data: sections, loading, error, refetch } = useList<Section>("/api/forum");
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/80">Loading forum...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center relative overflow-hidden">
        <div className="text-center">
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
            Error Loading Forum
          </h2>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <ContentCard className="p-8 mb-8">
        <PageHeader
          title="Forum"
          description="Discussion forums organized by topic"
        />
      </ContentCard>

      <div className="space-y-8">
        {sections.map((section) => (
          <div
            key={section.id}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
            </div>

            <div className="divide-y divide-white/10">
              {section.forums.map((forum) => (
                <div
                  key={forum.id}
                  className="p-6 hover:bg-white/5 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/forum/${forum.id}`}
                        className="text-lg font-semibold text-white/90 hover:text-white transition-colors"
                      >
                        {forum.title}
                      </Link>
                      <p className="text-sm text-white/60 mt-1">
                        {forum.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                        <span>{forum.threadCount} threads</span>
                        <span>{forum.postCount} posts</span>
                      </div>
                    </div>

                    {forum.latestThread && (
                      <div className="text-right max-w-xs">
                        <Link
                          href={`/thread/${forum.latestThread.id}`}
                          className="block text-sm text-white/70 hover:text-white transition-colors line-clamp-1"
                        >
                          {forum.latestThread.title}
                        </Link>
                        <div className="flex items-center justify-end gap-2 mt-1 text-xs text-white/50">
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
