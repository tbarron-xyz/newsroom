"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "../../schemas/types";
import { apiService } from "@/app/services/api.service";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";

interface BlueskyMessage {
  did: string;
  text: string;
  time: number;
}

interface BlueskyResponse {
  messages: BlueskyMessage[];
  count: number;
  timestamp: number;
}

export default function BlueskyMessagesPage() {
  const [data, setData] = useState<BlueskyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthAndFetchMessages();
  }, []);

  const checkAuthAndFetchMessages = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const userData = await apiService.get<{ user: User }>("/api/auth/verify");
      setCurrentUser(userData.user);

      if (userData.user.role !== "admin") {
        setError("Admin access required");
        setLoading(false);
        return;
      }

      const messagesData = await apiService.get<BlueskyResponse>(
        "/api/admin/bluesky-messages"
      );
      setData(messagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading Bluesky messages...</p>
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
              Access Denied
            </h2>
            <p className="tui-muted">{error}</p>
            <Link
              href="/login"
              className="inline-block mt-4 tui-btn-primary no-underline"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      <ContentCard variant="tui">
        <div className="p-6 border-b border-[var(--tui-border)]">
          <PageHeader
            variant="tui"
            title="Bluesky Messages"
            description="Bluesky messages will be obtained from bluesky.service.ts by constructing a fresh TinyJetstream from the npm package &quot;mbjc&quot;, listening for &quot;n&quot; messages, and then disposing the TinyJetstream."
          />
          {data && (
            <div className="mt-2 tui-text-muted">
              <span className="tui-text-primary font-medium">{data.count}</span> messages
              fetched at {formatTimestamp(data.timestamp)}
            </div>
          )}
        </div>

        <div className="p-6">
          {data ? (
            <div className="space-y-4">
              <div className="border border-[var(--tui-border)] p-4">
                <h3 className="tui-section-title mb-4">Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
                  <div>
                    <span className="tui-text-muted">Total Messages:</span>
                    <span className="ml-2 tui-text-primary">{data.count}</span>
                  </div>
                  <div>
                    <span className="tui-text-muted">Fetched At:</span>
                    <span className="ml-2 tui-text-primary">
                      {formatTimestamp(data.timestamp)}
                    </span>
                  </div>
                  <div>
                    <span className="tui-text-muted">Response Time:</span>
                    <span className="ml-2 tui-text-primary">
                      {Date.now() - data.timestamp}ms ago
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-[var(--tui-border)]">
                <div className="px-4 py-3 border-b border-[var(--tui-border)]">
                  <h3 className="tui-section-title">Messages</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {data.messages.length > 0 ? (
                    <div className="divide-y divide-[var(--tui-border)]">
                      {data.messages.map((message, index) => (
                        <div
                          key={index}
                          className="p-4 hover:bg-[var(--tui-hover-bg)] transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="tui-text-primary font-mono text-sm font-semibold">
                              #{index + 1}
                            </span>
                            <span className="tui-text-muted text-xs">
                              {formatTimestamp(message.time)}
                            </span>
                          </div>
                          <div className="font-mono text-sm tui-text-muted mb-2">
                            <strong className="text-[var(--tui-primary)]">DID:</strong>{" "}
                            {message.did}
                          </div>
                          <div className="font-mono text-sm tui-text-muted">
                            <strong className="text-[var(--tui-primary)]">Text:</strong>{" "}
                            {message.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center tui-text-muted">
                      No messages available
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-[var(--tui-border)]">
                <div className="px-4 py-3 border-b border-[var(--tui-border)]">
                  <h3 className="tui-section-title">Raw JSON Response</h3>
                </div>
                <div className="p-4">
                  <pre className="text-xs tui-text-muted bg-black border border-[var(--tui-border)] p-4 overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="tui-text-muted">No data available</p>
            </div>
          )}
        </div>
      </ContentCard>
    </PageContainer>
  );
}
