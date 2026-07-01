"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { Event } from "../schemas/types";
import { apiService } from "@/app/services/api.service";
import { useAuth } from "@/hooks/useAuth";
import { useList } from "@/hooks/useList";

interface SafeEvent {
  id: string;
  reporterId: string;
  title: string;
  createdTime: number;
  updatedTime: number;
  facts: string[];
  where?: string;
  when?: string;
  messageIds?: number[];
  messageTexts?: string[];
}

export default function EventsPage() {
  const { isAdmin } = useAuth();
  const {
    data: publicEvents,
    loading,
    refetch: refetchPublic
  } = useList<SafeEvent>("/api/events/public");
  const [adminEvents, setAdminEvents] = useState<Event[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminEvents = async () => {
    try {
      setAdminLoading(true);
      const eventsData = await apiService.get<{ events: Event[] }>(
        "/api/events"
      );
      setAdminEvents(eventsData.events || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch admin events"
      );
    } finally {
      setAdminLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleGenerateEvents = async () => {
    if (!isAdmin) return;

    try {
      setAdminLoading(true);
      await apiService.post("/api/events/generate");

      // Refresh both public and admin events
      await refetchPublic();
      await fetchAdminEvents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate events"
      );
      setAdminLoading(false);
    }
  };

  const handleGenerateArticlesFromEvents = async () => {
    if (!isAdmin) return;

    try {
      setAdminLoading(true);
      await apiService.post("/api/articles/generate-from-events");
      await refetchPublic();
      await fetchAdminEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate articles from events"
      );
      setAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      {/* Public Events Grid */}
      <ContentCard variant="tui" className="p-6 mb-8">
        <h3 className="tui-section-title mb-6">
          Recent Events
        </h3>
          {publicEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {publicEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-[var(--tui-border)] p-4 font-mono hover:bg-[var(--tui-hover-bg)] transition-colors duration-200"
                >
                  <h4 className="text-sm font-medium tui-text-primary mb-2">
                    {event.title}
                  </h4>
                  <div className="tui-text-muted text-xs mb-2">
                    Updated: {formatDate(event.updatedTime)}
                  </div>
                  {event.facts.length > 0 && (
                    <div className="text-xs tui-text-muted">
                      {event.facts.map((fact, index) => (
                        <div key={index} className="font-mono">• {fact}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-[var(--tui-border)] p-12 text-center">
              <p className="tui-text-muted">No events available</p>
            </div>
          )}
      </ContentCard>

        {/* Admin Section */}
        {isAdmin && (
          <ContentCard variant="tui">
            <div className="p-6 border-b border-[var(--tui-border)]">
              <PageHeader
                variant="tui"
                title="Event Management"
                description="View and manage all tracked events in the system"
              >
                <div className="flex space-x-3">
                  <button
                    onClick={handleGenerateEvents}
                    disabled={adminLoading}
                    className="tui-btn-primary"
                  >
                    Generate Events
                  </button>
                  <button
                    onClick={handleGenerateArticlesFromEvents}
                    disabled={adminLoading}
                    className="tui-btn"
                  >
                    Generate Articles from Events
                  </button>
                </div>
              </PageHeader>
            </div>

            {error && (
              <div className="tui-msg-error m-6">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--tui-border)]">
                    <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider w-1/3">
                      Facts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                      Where
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                      When
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                      Social Media Messages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adminEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-[var(--tui-border)] hover:bg-[var(--tui-hover-bg)] transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-sm tui-text-primary">
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-xs tui-text-muted mt-1">
                          ID: {event.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm tui-text-muted w-1/3 text-center">
                        <div className="space-y-1">
                          {event.facts.map((fact, index) => (
                            <div key={index} className="text-xs font-mono">
                              • {fact}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm tui-text-muted">
                        {event.where || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm tui-text-muted">
                        {event.when || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm tui-text-muted">
                        {event.messageTexts && event.messageTexts.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {event.messageTexts.map((text, index) => (
                              <div
                                key={index}
                                className="text-xs font-mono bg-black border border-[var(--tui-border)] p-2"
                              >
                                {text}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--tui-placeholder)] font-mono">No messages</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm tui-text-muted">
                        Reporter: {event.reporterId}
                        <br />
                        Created: {formatDate(event.createdTime)}
                        <br />
                        Updated: {formatDate(event.updatedTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adminEvents.length === 0 && (
              <div className="border-t border-[var(--tui-border)] p-12 text-center">
                <p className="tui-text-primary">No events found</p>
                <p className="tui-text-muted text-sm mt-2">
                  Click "Generate Events" to create new events from recent
                  social media data
                </p>
              </div>
            )}
          </ContentCard>
        )}
      </PageContainer>
  );
}
