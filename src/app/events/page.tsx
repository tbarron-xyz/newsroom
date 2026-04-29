"use client";

import { useState } from "react";
import Link from "next/link";
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
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/80">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        {/* Public Events Grid */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Recent Events
          </h3>
          {publicEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {publicEvents.map((event) => (
                <div
                  key={event.id}
                  className="backdrop-blur-xl bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors duration-200"
                >
                  <h4 className="text-sm font-medium text-white mb-2">
                    {event.title}
                  </h4>
                  <div className="text-xs text-white/60 mb-2">
                    Updated: {formatDate(event.updatedTime)}
                  </div>
                  {event.facts.length > 0 && (
                    <div className="text-xs text-white/70">
                      {event.facts.map((fact, index) => (
                        <div key={index}>• {fact}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/70">No events available</p>
            </div>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Event Management
                </h1>
                <p className="mt-1 text-sm text-white/80">
                  View and manage all tracked events in the system
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGenerateEvents}
                  disabled={adminLoading}
                  className="group relative inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  <span className="relative">Generate Events</span>
                </button>
                <button
                  onClick={handleGenerateArticlesFromEvents}
                  disabled={adminLoading}
                  className="group relative inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  <span className="relative">
                    Generate Articles from Events
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/10">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="backdrop-blur-xl bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider w-1/3">
                      Facts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Where
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      When
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Social Media Messages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="backdrop-blur-xl bg-white/5 divide-y divide-white/10">
                  {adminEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-xs text-white/60 mt-1">
                          ID: {event.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 w-1/3 text-center">
                        <div className="space-y-1">
                          {event.facts.map((fact, index) => (
                            <div key={index} className="text-xs">
                              • {fact}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {event.where || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {event.when || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {event.messageTexts && event.messageTexts.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {event.messageTexts.map((text, index) => (
                              <div
                                key={index}
                                className="text-xs bg-black/20 p-2 rounded"
                              >
                                {text}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-white/50">No messages</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
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
              <div className="text-center py-12">
                <p className="text-white/70">No events found</p>
                <p className="text-white/50 text-sm mt-2">
                  Click "Generate Events" to create new events from recent
                  social media data
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
