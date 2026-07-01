"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "../schemas/types";
import { apiService } from "@/app/services/api.service";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";

interface LogsResponse {
  logs: string[];
  count: number;
}

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthAndFetchLogs();
  }, []);

  const checkAuthAndFetchLogs = async () => {
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

      const logsData = await apiService.get<LogsResponse>("/api/logs/latest");
      setData(logsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading logs...</p>
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
            title="App Logs"
            description="Application logs from various cron jobs and processes."
          />
          {data && (
            <div className="mt-2 tui-text-muted">
              <span className="tui-text-primary font-medium">{data.count}</span> log entries
            </div>
          )}
        </div>

        <div className="p-6">
          {data ? (
            <div className="border border-[var(--tui-border)]">
              <div className="px-4 py-3 border-b border-[var(--tui-border)]">
                <h3 className="tui-section-title">Log Entries</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {data.logs.length > 0 ? (
                  <div className="divide-y divide-[var(--tui-border)]">
                    {data.logs.map((log, index) => (
                      <div
                        key={index}
                        className="p-4 hover:bg-[var(--tui-hover-bg)] transition-colors font-mono text-sm"
                      >
                        <span className="tui-text-muted">{log}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center tui-text-muted">
                    No logs available
                  </div>
                )}
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
