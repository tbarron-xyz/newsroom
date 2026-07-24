"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "@/app/services/api.service";
import { useAuth } from "@/hooks/useAuth";
import type {
  Article,
  NewspaperEdition,
  DailyEdition,
  Event
} from "../schemas/types";

type TabType = "articles" | "editions" | "daily-editions" | "events";

const TABS: { key: TabType; label: string }[] = [
  { key: "articles", label: "Articles" },
  { key: "editions", label: "Editions" },
  { key: "daily-editions", label: "Daily Editions" },
  { key: "events", label: "Events" }
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function AllPage() {
  const { user, loading: authLoading, hasEditor } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("articles");
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (tab: TabType) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.get<unknown[]>(
        `/api/all?type=${tab}&limit=500`
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasEditor) {
      fetchData(activeTab);
    }
  }, [activeTab, hasEditor, fetchData]);

  if (authLoading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
      </div>
    );
  }

  if (!hasEditor) {
    return (
      <PageContainer variant="tui">
        <ContentCard variant="tui" className="p-12 text-center">
          <h2 className="text-xl font-semibold text-[var(--tui-primary)] font-mono mb-4">
            Access Denied
          </h2>
          <p className="tui-text-muted">
            Editor access required to view this page.
          </p>
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="tui" maxWidth="max-w-7xl">
      <ContentCard variant="tui" className="p-6 mb-8">
        <PageHeader
          variant="tui"
          title="All Generations"
          description="Browse all LLM-generated outputs across the system"
        />
      </ContentCard>

      {/* Tab Bar */}
      <div className="mb-6 flex space-x-1 border-b border-[var(--tui-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-mono transition-colors ${
              activeTab === tab.key
                ? "text-[var(--tui-primary)] border-b-2 border-[var(--tui-primary)]"
                : "text-[var(--tui-muted)] hover:text-[var(--tui-primary)] hover:bg-[var(--tui-hover-bg)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner"></div>
        </div>
      )}

      {/* Error */}
      {error && !loading && <div className="tui-msg-error mb-6">{error}</div>}

      {/* Content */}
      {!loading && !error && data.length === 0 && (
        <div className="border border-[var(--tui-border)] p-12 text-center">
          <p className="tui-text-primary">
            No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}{" "}
            found
          </p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto border border-[var(--tui-border)]">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--tui-border)] bg-black">
                {activeTab === "articles" && (
                  <>
                    <TH>Headline</TH>
                    <TH>Reporter</TH>
                    <TH>Generated</TH>
                    <TH>Model</TH>
                    <TH>Tokens</TH>
                  </>
                )}
                {activeTab === "editions" && (
                  <>
                    <TH>ID</TH>
                    <TH>Stories</TH>
                    <TH>Generated</TH>
                    <TH>Model</TH>
                    <TH>Tokens</TH>
                  </>
                )}
                {activeTab === "daily-editions" && (
                  <>
                    <TH>Name</TH>
                    <TH>Topics</TH>
                    <TH>Generated</TH>
                    <TH>Model</TH>
                    <TH>Published</TH>
                  </>
                )}
                {activeTab === "events" && (
                  <>
                    <TH>Title</TH>
                    <TH>Reporter</TH>
                    <TH>Facts</TH>
                    <TH>Updated</TH>
                    <TH>Model</TH>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === "articles" &&
                (data as Article[]).map((item) => (
                  <Row key={item.id} href={`/articles/${item.id}`}>
                    <TD className="max-w-xs">
                      <span className="font-semibold">{item.headline}</span>
                    </TD>
                    <TD>{item.reporterId}</TD>
                    <TD>{formatDate(item.generationTime)}</TD>
                    <TD>{item.modelName}</TD>
                    <TD>
                      {item.inputTokenCount != null
                        ? `${item.inputTokenCount} / ${item.outputTokenCount ?? "?"}`
                        : "-"}
                    </TD>
                  </Row>
                ))}
              {activeTab === "editions" &&
                (data as NewspaperEdition[]).map((item) => (
                  <Row key={item.id} href={`/editions?id=${item.id}`}>
                    <TD className="max-w-[10rem] font-mono text-xs">
                      {item.id.slice(0, 16)}...
                    </TD>
                    <TD>{(item.stories || []).length}</TD>
                    <TD>{formatDate(item.generationTime)}</TD>
                    <TD>{item.modelName}</TD>
                    <TD>
                      {item.inputTokenCount != null
                        ? `${item.inputTokenCount} / ${item.outputTokenCount ?? "?"}`
                        : "-"}
                    </TD>
                  </Row>
                ))}
              {activeTab === "daily-editions" &&
                (data as DailyEdition[]).map((item) => (
                  <Row key={item.id} href={`/daily-edition?id=${item.id}`}>
                    <TD className="max-w-xs">
                      {item.newspaperName || "Daily Edition"}
                    </TD>
                    <TD>{(item.topics || []).length}</TD>
                    <TD>{formatDate(item.generationTime)}</TD>
                    <TD>{item.modelName}</TD>
                    <TD>
                      {item.published !== false ? (
                        <span className="text-green-500">Yes</span>
                      ) : (
                        <span className="text-[var(--tui-muted)]">Draft</span>
                      )}
                    </TD>
                  </Row>
                ))}
              {activeTab === "events" &&
                (data as Event[]).map((item) => (
                  <Row key={item.id} href="/events">
                    <TD className="max-w-xs">
                      <span className="font-semibold">{item.title}</span>
                    </TD>
                    <TD>{item.reporterId}</TD>
                    <TD>{item.facts.length}</TD>
                    <TD>{formatDate(item.updatedTime)}</TD>
                    <TD>{item.modelName}</TD>
                  </Row>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center mt-8">
        <p className="tui-text-muted text-xs">
          Showing {data.length}{" "}
          {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}
        </p>
      </div>
    </PageContainer>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

function TD({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-5 py-3 text-sm tui-text-muted ${className}`}>
      {children}
    </td>
  );
}

function Row({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <tr className="border-b border-[var(--tui-border)] hover:bg-[var(--tui-hover-bg)] transition-colors duration-200 cursor-pointer">
      {children}
      <td className="px-5 py-3 text-right text-xs font-mono text-[var(--tui-primary)] whitespace-nowrap">
        <Link href={href} className="hover:underline">
          View →
        </Link>
      </td>
    </tr>
  );
}
