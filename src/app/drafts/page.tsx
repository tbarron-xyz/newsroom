"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "../services/api.service";
import DailyEditionFullView from "../components/DailyEditionFullView";
import ContentCard from "../../components/ContentCard";
import type { DailyEdition } from "../schemas/types";

type Tab = "articles" | "editions" | "daily-editions";

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("daily-editions");
  const [dailyEditions, setDailyEditions] = useState<DailyEdition[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DailyEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkEditorStatus();
  }, []);

  useEffect(() => {
    if (isEditor) {
      fetchDrafts();
    }
  }, [isEditor, activeTab]);

  const checkEditorStatus = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setIsEditor(false);
        router.push("/login");
        return;
      }
      const data = await apiService.get<{
        user: { role: string; permission: string };
      }>("/api/auth/verify");
      setIsEditor(
        data.user.role === "admin" || data.user.permission === "editor"
      );
    } catch {
      setIsEditor(false);
      router.push("/login");
    }
  };

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      if (activeTab === "daily-editions") {
        const data = await apiService.get<DailyEdition[]>(
          "/api/drafts/daily-editions"
        );
        setDailyEditions(data.filter((e) => e.published === false));
      }
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setLoading(false);
    }
  };

  const publishDraft = async () => {
    if (!selectedDraft) return;
    setPublishing(true);
    try {
      const result = await apiService.post<{
        success: boolean;
        edition: DailyEdition;
      }>(`/api/drafts/daily-editions/${selectedDraft.id}/publish`);
      setSelectedDraft(result.edition);
    } catch (error) {
      console.error("Error publishing draft:", error);
    } finally {
      setPublishing(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "articles", label: "Articles" },
    { key: "editions", label: "Editions" },
    { key: "daily-editions", label: "Daily Editions" }
  ];

  if (selectedDraft) {
    return (
      <div className="tui-theme min-h-screen bg-black py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setSelectedDraft(null)} className="tui-btn">
              &larr; Back to drafts
            </button>
            {selectedDraft.published === false && (
              <button
                onClick={publishDraft}
                disabled={publishing}
                className={`px-4 py-2 font-mono text-sm border transition-colors ${
                  publishing
                    ? "border-[#557755] text-[#557755] cursor-not-allowed"
                    : "border-[var(--tui-primary)] text-[var(--tui-primary)] hover:bg-[var(--tui-primary)] hover:text-black"
                }`}
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            )}
          </div>
          <DailyEditionFullView
            edition={selectedDraft}
            badge={selectedDraft.published === false ? "DRAFT" : "PUBLISHED"}
          />
          <div className="text-center mt-8 text-[#335533] font-mono text-sm">
            <p>Drafts Review Panel</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tui-theme min-h-screen bg-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="border border-[var(--tui-border)] p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--tui-primary)] text-xl font-mono mb-1">
                # Drafts
              </h1>
              <p className="text-[#557755] text-sm font-mono">
                Review and manage unpublished content
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedDraft(null);
              }}
              className={`px-4 py-2 font-mono text-sm transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--tui-primary)] text-black"
                  : "border border-[var(--tui-border)] text-white/60 hover:text-[var(--tui-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Daily Editions Drafts */}
        {activeTab === "daily-editions" && (
          <div className="border border-[var(--tui-border)] p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse">
                  $ Loading drafts...
                </div>
              </div>
            ) : dailyEditions.length === 0 ? (
              <div className="text-center py-8">
                <p className="tui-muted">No draft daily editions found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyEditions.map((edition) => (
                  <button
                    key={edition.id}
                    onClick={() => setSelectedDraft(edition)}
                    className="w-full text-left border border-[var(--tui-border)] p-4 hover:bg-[var(--tui-hover-bg)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[var(--tui-primary)] font-mono text-sm">
                          {edition.frontPageHeadline || "Untitled"}
                        </h3>
                        <p className="tui-muted text-xs mt-1">
                          {edition.id} &middot;{" "}
                          {edition.generationTime
                            ? new Date(edition.generationTime).toLocaleString()
                            : "Unknown time"}
                        </p>
                      </div>
                      <span className="text-[#ffb000] font-mono text-xs border border-[#ffb000] px-2 py-0.5">
                        DRAFT
                      </span>
                    </div>

                    {edition.frontPageArticle && (
                      <p className="tui-muted text-sm mb-3 line-clamp-2">
                        {edition.frontPageArticle}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs tui-muted">
                      {edition.modelName && (
                        <div>
                          <span className="text-white/40">Model: </span>
                          {edition.modelName}
                        </div>
                      )}
                      {edition.editions && (
                        <div>
                          <span className="text-white/40">Editions: </span>
                          {edition.editions.length}
                        </div>
                      )}
                      {edition.topics && (
                        <div>
                          <span className="text-white/40">Topics: </span>
                          {edition.topics.length}
                        </div>
                      )}
                      {edition.prompt && (
                        <div className="col-span-2 truncate">
                          <span className="text-white/40">Prompt: </span>
                          {edition.prompt}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Articles Drafts - placeholder */}
        {activeTab === "articles" && (
          <div className="border border-[var(--tui-border)] p-6">
            <div className="text-center py-8">
              <p className="tui-muted">Article drafts coming soon.</p>
            </div>
          </div>
        )}

        {/* Editions Drafts - placeholder */}
        {activeTab === "editions" && (
          <div className="border border-[var(--tui-border)] p-6">
            <div className="text-center py-8">
              <p className="tui-muted">Edition drafts coming soon.</p>
            </div>
          </div>
        )}

        <div className="text-center mt-8 text-[#335533] font-mono text-sm">
          <p>Drafts Review Panel</p>
        </div>
      </div>
    </div>
  );
}
