"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KpiName } from "../schemas/types";
import { apiService } from "../services/api.service";

interface EditorData {
  bio: string;
  prompt: string;
  modelName: string;
  articleModelName: string;
  eventModelName: string;
  storySelectionModelName: string;
  editionSelectionModelName: string;
  messageSliceCount: number;
  inputTokenCost: number;
  outputTokenCost: number;
  baseUrl: string;
  articleGenerationPeriodMinutes: number;
  lastArticleGenerationTime: number | null;
  eventGenerationPeriodMinutes: number;
  lastEventGenerationTime: number | null;
  editionGenerationPeriodMinutes: number;
  lastEditionGenerationTime: number | null;
}

interface KpiData {
  [KpiName.TOTAL_AI_API_SPEND]: number;
  [KpiName.TOTAL_TEXT_INPUT_TOKENS]: number;
  [KpiName.TOTAL_TEXT_OUTPUT_TOKENS]: number;
}

interface MemoryInfo {
  redis: { usedMemory: number; usedMemoryPeak: number };
  system: { totalMemory: number; usedMemory: number; freeMemory: number };
}

interface JobStatus {
  status: {
    reporterJob: boolean;
    newspaperJob: boolean;
    dailyJob: boolean;
  };
  lastRuns: {
    reporterJob: Date | null;
    newspaperJob: Date | null;
    dailyJob: Date | null;
  };
  nextRuns: {
    reporterJob: Date | null;
    newspaperJob: Date | null;
    dailyJob: Date | null;
  };
  note?: string;
}

export default function EditorPage() {
  const [editorData, setEditorData] = useState<EditorData>({
    bio: "",
    prompt: "",
    modelName: "",
    articleModelName: "",
    eventModelName: "",
    storySelectionModelName: "",
    editionSelectionModelName: "",
    messageSliceCount: 200,
    inputTokenCost: 0.05,
    outputTokenCost: 0.4,
    baseUrl: "",
    articleGenerationPeriodMinutes: 15,
    lastArticleGenerationTime: null,
    eventGenerationPeriodMinutes: 30,
    lastEventGenerationTime: null,
    editionGenerationPeriodMinutes: 180,
    lastEditionGenerationTime: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [jobTriggering, setJobTriggering] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [appName, setAppName] = useState("Newsroom");
  const [dailyJobId, setDailyJobId] = useState<string | null>(null);
  const [dailyJobStatus, setDailyJobStatus] = useState<any>(null);
  const [reporterJobId, setReporterJobId] = useState<string | null>(null);
  const [reporterJobStatus, setReporterJobStatus] = useState<any>(null);
  const [numComments, setNumComments] = useState(1);
  const router = useRouter();

  // Check admin status and fetch data on component mount
  useEffect(() => {
    checkAdminStatus();
    fetchEditorData();
    fetchJobStatus();
    fetchKpiData();
    fetchMemoryInfo();
  }, []);

  // Auto-resume polling if jobs are running
  useEffect(() => {
    if (isAdmin && jobStatus?.status?.dailyJob && !dailyJobId) {
      fetchActiveDailyJobId();
    }
    if (isAdmin && jobStatus?.status?.reporterJob && !reporterJobId) {
      fetchActiveReporterJobId();
    }
  }, [jobStatus, isAdmin]);

  // Load app configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await apiService.get<{ app: { name: string } }>(
          "/api/config"
        );
        setAppName(config.app.name);
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadConfig();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setIsAdmin(false);
        return;
      }

      const data = await apiService.get<{ user: { role: string } }>(
        "/api/auth/verify"
      );
      setIsAdmin(data.user.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const fetchEditorData = async () => {
    try {
      const data = await apiService.get<EditorData>("/api/editor");
      setEditorData(data);
    } catch (error) {
      setMessage("Error loading editor data");
      console.error("Error fetching editor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveEditorData = async () => {
    setSaving(true);
    setMessage("");

    try {
      const requestBody = {
        ...editorData
      };

      await apiService.put("/api/editor", requestBody);
      setMessage("Editor data saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(error.error || "Error saving editor data");
      console.error("Error saving editor data:", error);
    } finally {
      setSaving(false);
    }
  };

  const triggerJob = async (jobType: string, count?: number) => {
    setJobTriggering(jobType);
    setMessage("");

    try {
      const requestBody = {
        jobType,
        ...(count && { count })
      };

      if (jobType === "daily") {
        const result = await apiService.post<{
          jobId: string;
          message: string;
        }>("/api/editor/jobs", requestBody);
        setMessage(result.message);
        setDailyJobId(result.jobId);
        setDailyJobStatus({ status: "waiting" });
        // start polling
        setTimeout(pollDailyJobStatus, 5000);
      } else if (jobType === "reporter") {
        const result = await apiService.post<{
          jobId: string;
          message: string;
        }>("/api/editor/jobs", requestBody);
        setMessage(result.message);
        setReporterJobId(result.jobId);
        setReporterJobStatus({ status: "waiting" });
        // start polling
        setTimeout(pollReporterJobStatus, 5000);
      } else {
        const result = await apiService.post<{ message: string }>(
          "/api/editor/jobs",
          requestBody
        );
        setMessage(result.message);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error: any) {
      setMessage(error.error || `Error triggering ${jobType} job`);
      console.error(`Error triggering ${jobType} job:`, error);
    } finally {
      setJobTriggering(null);
    }
  };

  const fetchJobStatus = async () => {
    try {
      const status = await apiService.get<JobStatus>("/api/editor/jobs");
      setJobStatus(status);
    } catch (error) {
      console.error("Error fetching job status:", error);
    }
  };

  const fetchKpiData = async () => {
    try {
      const data = await apiService.get<KpiData>("/api/kpi");
      setKpiData(data);
    } catch (error) {
      console.error("Error fetching KPI data:", error);
    }
  };

  const fetchMemoryInfo = async () => {
    try {
      const data = await apiService.get<MemoryInfo>("/api/editor/memory");
      setMemoryInfo(data);
    } catch (error) {
      console.error("Error fetching memory info:", error);
    }
  };

  const pollDailyJobStatus = async () => {
    if (!dailyJobId) return;
    try {
      const status = await apiService.get<any>(
        `/api/editor/jobs/${dailyJobId}`
      );
      setDailyJobStatus(status);
      if (status.status === "completed") {
        setMessage("Daily edition generated successfully");
        setTimeout(() => setMessage(""), 5000);
        setDailyJobId(null);
        setDailyJobStatus(null);
        fetchJobStatus(); // update last runs
      } else if (status.status === "failed") {
        setMessage("Daily edition generation failed");
        setTimeout(() => setMessage(""), 5000);
        setDailyJobId(null);
        setDailyJobStatus(null);
      } else {
        // still running or waiting, keep polling
        setTimeout(pollDailyJobStatus, 5000);
      }
    } catch (error) {
      console.error("Error polling job status:", error);
    }
  };

  const pollReporterJobStatus = async () => {
    if (!reporterJobId) return;
    try {
      const status = await apiService.get<any>(
        `/api/editor/jobs/${reporterJobId}`
      );
      setReporterJobStatus(status);
      if (status.status === "completed") {
        setMessage("Reporter articles generated successfully");
        setTimeout(() => setMessage(""), 5000);
        setReporterJobId(null);
        setReporterJobStatus(null);
        fetchJobStatus(); // update last runs
      } else if (status.status === "failed") {
        setMessage("Reporter articles generation failed");
        setTimeout(() => setMessage(""), 5000);
        setReporterJobId(null);
        setReporterJobStatus(null);
      } else {
        // still running or waiting, keep polling
        setTimeout(pollReporterJobStatus, 5000);
      }
    } catch (error) {
      console.error("Error polling reporter job status:", error);
    }
  };

  const fetchActiveDailyJobId = async () => {
    try {
      const result = await apiService.get<{ jobId: string | null }>(
        "/api/editor/jobs/daily"
      );
      if (result.jobId) {
        setDailyJobId(result.jobId);
        setDailyJobStatus({ status: "active" }); // assume active
        pollDailyJobStatus(); // start polling immediately if reloads
      }
    } catch (error) {
      console.error("Error fetching active daily job:", error);
    }
  };

  const fetchActiveReporterJobId = async () => {
    try {
      const result = await apiService.get<{ jobId: string | null }>(
        "/api/editor/jobs/reporter"
      );
      if (result.jobId) {
        setReporterJobId(result.jobId);
        setReporterJobStatus({ status: "active" }); // assume active
        pollReporterJobStatus(); // start polling immediately if reloads
      }
    } catch (error) {
      console.error("Error fetching active reporter job:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-[var(--tui-primary)] font-mono text-sm">
          <span className="animate-pulse">$</span> Loading editor configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="tui-theme min-h-screen bg-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border border-[var(--tui-border)] p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--tui-primary)] text-xl font-mono mb-1">
                # Newsroom Editor Configuration
              </h1>
              <p className="text-[#557755] text-sm font-mono">
                Configure your AI editor&apos;s biography and editorial guidelines
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="tui-btn-danger px-4 py-2"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="border border-[var(--tui-border)] p-6 space-y-8">
          {/* Bio Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Editor Biography</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4">
              <textarea
                value={editorData.bio}
                onChange={(e) =>
                  setEditorData({ ...editorData, bio: e.target.value })
                }
                placeholder="Enter the editor's biography..."
                className={`tui-input h-32 resize-none ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                rows={4}
                readOnly={!isAdmin}
              />
              <p className="tui-muted mt-2">
                This biography will be used to inform the AI&apos;s editorial
                decisions and writing style.
              </p>
            </div>
          </div>

          {/* Prompt Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Editorial Prompt</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4">
              <textarea
                value={editorData.prompt}
                onChange={(e) =>
                  setEditorData({ ...editorData, prompt: e.target.value })
                }
                placeholder="Enter the editorial guidelines and prompt..."
                className={`tui-input h-48 resize-none ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                rows={6}
                readOnly={!isAdmin}
              />
              <p className="tui-muted mt-2">
                Define the editorial standards, tone, and guidelines that will
                guide the AI&apos;s newsroom decisions.
              </p>
            </div>
          </div>

          {/* Model Name Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">AI Model Configuration</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4 space-y-6">
              {/* Legacy / Default Model Name */}
              <div>
                <label className="tui-label block mb-2">
                  Default Model Name
                </label>
                <input
                  type="text"
                  value={editorData.modelName}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      modelName: e.target.value
                    })
                  }
                  placeholder="Enter AI model name (e.g., gpt-5-nano)"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Default AI model used for thread replies and daily edition
                  comments when specific model fields are empty.
                </p>
              </div>

              {/* Article Generation Model */}
              <div>
                <label className="tui-label block mb-2">
                  Article Generation Model
                </label>
                <input
                  type="text"
                  value={editorData.articleModelName}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      articleModelName: e.target.value
                    })
                  }
                  placeholder="Enter AI model name (e.g., gpt-5-nano)"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  AI model used for generating news articles from social media
                  data.
                </p>
              </div>

              {/* Event Generation Model */}
              <div>
                <label className="tui-label block mb-2">
                  Event Generation Model
                </label>
                <input
                  type="text"
                  value={editorData.eventModelName}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      eventModelName: e.target.value
                    })
                  }
                  placeholder="Enter AI model name (e.g., gpt-5-nano)"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  AI model used for identifying and tracking news events from
                  social media.
                </p>
              </div>

              {/* Story Selection Model */}
              <div>
                <label className="tui-label block mb-2">
                  Story Selection Model
                </label>
                <input
                  type="text"
                  value={editorData.storySelectionModelName}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      storySelectionModelName: e.target.value
                    })
                  }
                  placeholder="Enter AI model name (e.g., gpt-5-nano)"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  AI model used for selecting the most newsworthy stories for
                  newspaper editions.
                </p>
              </div>

              {/* Edition Selection Model */}
              <div>
                <label className="tui-label block mb-2">
                  Edition Selection Model
                </label>
                <input
                  type="text"
                  value={editorData.editionSelectionModelName}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      editionSelectionModelName: e.target.value
                    })
                  }
                  placeholder="Enter AI model name (e.g., gpt-5-nano)"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  AI model used for selecting and compiling newspaper editions
                  into daily editions.
                </p>
              </div>

              {/* Base URL */}
              <div>
                <label className="tui-label block mb-2">
                  OpenAI API Base URL
                </label>
                <input
                  type="url"
                  value={editorData.baseUrl}
                  onChange={(e) =>
                    setEditorData({ ...editorData, baseUrl: e.target.value })
                  }
                  placeholder="https://api.openai.com/v1 (leave empty for default)"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Custom base URL for OpenAI API requests. Leave empty to use
                  the default OpenAI API. Useful for custom endpoints or
                  proxies.
                </p>
              </div>

              {/* Input Token Cost */}
              <div>
                <label className="tui-label block mb-2">
                  Input Token Cost ($ per 1M tokens)
                </label>
                <input
                  type="number"
                  value={editorData.inputTokenCost}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      inputTokenCost: parseFloat(e.target.value) || 0
                    })
                  }
                  placeholder="0.050"
                  min="0"
                  step="0.001"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Cost per million input tokens for AI API calls. Used to
                  calculate and track API spending.
                </p>
              </div>

              {/* Output Token Cost */}
              <div>
                <label className="tui-label block mb-2">
                  Output Token Cost ($ per 1M tokens)
                </label>
                <input
                  type="number"
                  value={editorData.outputTokenCost}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      outputTokenCost: parseFloat(e.target.value) || 0
                    })
                  }
                  placeholder="0.400"
                  min="0"
                  step="0.001"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Cost per million output tokens for AI API calls. Used to
                  calculate and track API spending.
                </p>
              </div>
            </div>
          </div>

          {/* Message Slice Count Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Message Slice Count</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4">
              <input
                type="number"
                value={editorData.messageSliceCount}
                onChange={(e) =>
                  setEditorData({
                    ...editorData,
                    messageSliceCount: parseInt(e.target.value) || 200
                  })
                }
                placeholder="Enter message slice count (e.g., 200)"
                min="1"
                max="1000"
                className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                readOnly={!isAdmin}
              />
              <p className="tui-muted mt-2">
                Number of recent messages to fetch from Bluesky for article
                generation (1-1000). Higher values provide more context but may
                slow down processing.
              </p>
            </div>
          </div>

          {/* Article Generation Period Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Article Generation Period</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4 space-y-4">
              <div>
                <label className="tui-label block mb-2">
                  Generation Interval (minutes)
                </label>
                <input
                  type="number"
                  value={editorData.articleGenerationPeriodMinutes}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      articleGenerationPeriodMinutes:
                        parseInt(e.target.value) || 15
                    })
                  }
                  placeholder="Enter generation period in minutes (e.g., 15)"
                  min="1"
                  max="1440"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Minimum time interval between article generation runs (1-1440
                  minutes). The cron job will skip generation if this duration
                  hasn&apos;t elapsed since the last run.
                </p>
              </div>

              <div>
                <label className="tui-label block mb-2">
                  Last Generation Time
                </label>
                <input
                  type="text"
                  value={
                    editorData.lastArticleGenerationTime
                      ? new Date(
                          editorData.lastArticleGenerationTime
                        ).toLocaleString()
                      : "Never"
                  }
                  placeholder="No generation has occurred yet"
                  className="tui-input opacity-50 cursor-not-allowed"
                  readOnly
                />
                <p className="tui-muted mt-2">
                  Timestamp of the last successful article generation run. This
                  field is automatically updated by the system.
                </p>
              </div>
            </div>
          </div>

          {/* Event Generation Period Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Event Generation Period</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4 space-y-4">
              <div>
                <label className="tui-label block mb-2">
                  Generation Interval (minutes)
                </label>
                <input
                  type="number"
                  value={editorData.eventGenerationPeriodMinutes}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      eventGenerationPeriodMinutes:
                        parseInt(e.target.value) || 30
                    })
                  }
                  placeholder="Enter generation period in minutes (e.g., 30)"
                  min="1"
                  max="1440"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Minimum time interval between event generation runs (1-1440
                  minutes). The cron job will skip generation if this duration
                  hasn&apos;t elapsed since the last run.
                </p>
              </div>

              <div>
                <label className="tui-label block mb-2">
                  Last Generation Time
                </label>
                <input
                  type="text"
                  value={
                    editorData.lastEventGenerationTime
                      ? new Date(
                          editorData.lastEventGenerationTime
                        ).toLocaleString()
                      : "Never"
                  }
                  placeholder="No generation has occurred yet"
                  className="tui-input opacity-50 cursor-not-allowed"
                  readOnly
                />
                <p className="tui-muted mt-2">
                  Timestamp of the last successful event generation run. This
                  field is automatically updated by the system.
                </p>
              </div>
            </div>
          </div>

          {/* Edition Generation Period Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Edition Generation Period</h2>
            </div>
            <div className="border border-[var(--tui-border)] p-4 space-y-4">
              <div>
                <label className="tui-label block mb-2">
                  Generation Interval (minutes)
                </label>
                <input
                  type="number"
                  value={editorData.editionGenerationPeriodMinutes}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      editionGenerationPeriodMinutes:
                        parseInt(e.target.value) || 180
                    })
                  }
                  placeholder="Enter generation period in minutes (e.g., 180)"
                  min="1"
                  max="1440"
                  className={`tui-input ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  readOnly={!isAdmin}
                />
                <p className="tui-muted mt-2">
                  Minimum time interval between edition generation runs (1-1440
                  minutes). The cron job will skip generation if this duration
                  hasn&apos;t elapsed since the last run.
                </p>
              </div>

              <div>
                <label className="tui-label block mb-2">
                  Last Generation Time
                </label>
                <input
                  type="text"
                  value={
                    editorData.lastEditionGenerationTime
                      ? new Date(
                          editorData.lastEditionGenerationTime
                        ).toLocaleString()
                      : "Never"
                  }
                  placeholder="No generation has occurred yet"
                  className="tui-input opacity-50 cursor-not-allowed"
                  readOnly
                />
                <p className="tui-muted mt-2">
                  Timestamp of the last successful edition generation run. This
                  field is automatically updated by the system.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--tui-border)]">
            <button
              onClick={fetchEditorData}
              disabled={!isAdmin}
              className={`tui-btn ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              $ Refresh Data
            </button>

            <div className="flex items-center space-x-4">
              {message && (
                <div
                  className={
                    message.includes("successfully")
                      ? "tui-msg-success"
                      : "tui-msg-error"
                  }
                >
                  {message}
                </div>
              )}

              <button
                onClick={saveEditorData}
                disabled={saving || !isAdmin}
                className={`tui-btn-primary ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {saving ? "Saving..." : "[ Save Changes ]"}
              </button>
            </div>
          </div>
        </div>

        {/* KPI Display Section */}
        <div className="border border-[var(--tui-border)] p-6 mt-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">AI Usage Metrics</h2>
            </div>

            <p className="tui-muted">
              Track your AI API usage and costs across all newsroom operations.
            </p>

            {kpiData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total AI API Spend */}
                <div className="border border-[var(--tui-border)] p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[var(--tui-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[var(--tui-primary)] font-mono text-sm">API Spend</h3>
                      <p className="tui-muted">Total cost</p>
                    </div>
                  </div>
                  <div className="tui-value">
                    ${kpiData[KpiName.TOTAL_AI_API_SPEND].toFixed(4)}
                  </div>
                </div>

                {/* Total Input Tokens */}
                <div className="border border-[var(--tui-border)] p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[var(--tui-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[var(--tui-primary)] font-mono text-sm">Input Tokens</h3>
                      <p className="tui-muted">Total sent</p>
                    </div>
                  </div>
                  <div className="tui-value">
                    {kpiData[KpiName.TOTAL_TEXT_INPUT_TOKENS].toLocaleString()}
                  </div>
                </div>

                {/* Total Output Tokens */}
                <div className="border border-[var(--tui-border)] p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[var(--tui-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[var(--tui-primary)] font-mono text-sm">Output Tokens</h3>
                      <p className="tui-muted">Total received</p>
                    </div>
                  </div>
                  <div className="tui-value">
                    {kpiData[KpiName.TOTAL_TEXT_OUTPUT_TOKENS].toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse mb-4">$ Loading KPI data...</div>
              </div>
            )}

            <div className="flex items-center justify-center pt-4">
              <button
                onClick={fetchKpiData}
                className="tui-btn"
              >
                $ Refresh Metrics
              </button>
            </div>
          </div>
        </div>

          {/* Memory & Storage Section */}
        <div className="border border-[var(--tui-border)] p-6 mt-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Memory &amp; Storage</h2>
            </div>

            <p className="tui-muted">
              Current database storage (disk) and system memory usage.
            </p>

            {memoryInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Database Storage */}
                <div className="border border-[var(--tui-border)] p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[var(--tui-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[var(--tui-primary)] font-mono text-sm">Database</h3>
                      <p className="tui-muted">On-disk storage</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="tui-muted">File Size</span>
                      <span className="text-[var(--tui-primary)] font-mono text-lg">
                        {(memoryInfo.redis.usedMemory / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="tui-muted">On Disk</span>
                      <span className="text-[var(--tui-primary)] font-mono text-lg">
                        {(
                          memoryInfo.redis.usedMemoryPeak /
                          1024 /
                          1024
                        ).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Memory */}
                <div className="border border-[var(--tui-border)] p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[var(--tui-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[var(--tui-primary)] font-mono text-sm">System</h3>
                      <p className="tui-muted">Host machine</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="tui-muted">Total</span>
                      <span className="text-[var(--tui-primary)] font-mono text-lg">
                        {(
                          memoryInfo.system.totalMemory /
                          1024 /
                          1024 /
                          1024
                        ).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="tui-muted">Used</span>
                      <span className="text-[var(--tui-primary)] font-mono text-lg">
                        {(
                          memoryInfo.system.usedMemory /
                          1024 /
                          1024 /
                          1024
                        ).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="tui-muted">Free</span>
                      <span className="text-[var(--tui-primary)] font-mono text-lg">
                        {(
                          memoryInfo.system.freeMemory /
                          1024 /
                          1024 /
                          1024
                        ).toFixed(2)} GB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-[var(--tui-primary)] font-mono text-sm animate-pulse mb-4">$ Loading memory info...</div>
              </div>
            )}

            <div className="flex items-center justify-center pt-4">
              <button
                onClick={fetchMemoryInfo}
                className="tui-btn"
              >
                $ Refresh Memory
              </button>
            </div>
          </div>
        </div>

        {/* Manual Job Triggers */}
        <div className="border border-[var(--tui-border)] p-6 mt-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--tui-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="tui-section-title">Manual Job Triggers</h2>
            </div>

            <p className="tui-muted">
              Manually trigger scheduled jobs for testing and immediate
              execution. These jobs run the same logic as the automated cron
              jobs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Reporter Articles Job */}
              <div className="border border-[var(--tui-border)] p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[var(--tui-primary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[var(--tui-primary)] font-mono text-sm">Generate Articles</h3>
                    <p className="tui-muted">Every 15 minutes</p>
                  </div>
                </div>
                <p className="tui-muted">
                  Triggers article generation for all reporters in the system.
                </p>
                <button
                  onClick={() => triggerJob("reporter")}
                  disabled={
                    jobTriggering === "reporter" ||
                    reporterJobId !== null ||
                    !isAdmin
                  }
                  className={`tui-btn w-full text-center ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {jobTriggering === "reporter" || reporterJobStatus ? (
                    <>
                      {reporterJobStatus?.status === "completed"
                        ? "Completing..."
                        : reporterJobStatus?.status === "failed"
                          ? "Failed"
                          : jobTriggering === "reporter"
                            ? "Generating..."
                            : "Running..."}
                    </>
                  ) : (
                    "Trigger Articles"
                  )}
                </button>
              </div>

              {/* Newspaper Edition Job */}
              <div className="border border-[var(--tui-border)] p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[var(--tui-primary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM16 2v4M8 2v4M3 10h18"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[var(--tui-primary)] font-mono text-sm">Newspaper Edition</h3>
                    <p className="tui-muted">Every 3 hours</p>
                  </div>
                </div>
                <p className="tui-muted">
                  Creates a newspaper edition from available articles.
                </p>
                <button
                  onClick={() => triggerJob("newspaper")}
                  disabled={jobTriggering === "newspaper" || !isAdmin}
                  className={`tui-btn w-full text-center ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {jobTriggering === "newspaper" ? "Creating..." : "Create Edition"}
                </button>
              </div>

              {/* Daily Edition Job */}
              <div className="border border-[var(--tui-border)] p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[var(--tui-primary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[var(--tui-primary)] font-mono text-sm">Daily Edition</h3>
                    <p className="tui-muted">Every 24 hours</p>
                  </div>
                </div>
                <p className="tui-muted">
                  Compiles all newspaper editions into a daily edition.
                </p>
                <button
                  onClick={() => triggerJob("daily")}
                  disabled={
                    jobTriggering === "daily" || dailyJobId !== null || !isAdmin
                  }
                  className={`tui-btn w-full text-center ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {jobTriggering === "daily" || dailyJobStatus ? (
                    dailyJobStatus?.status === "completed"
                      ? "Completing..."
                      : dailyJobStatus?.status === "failed"
                        ? "Failed"
                        : "Compiling..."
                  ) : (
                    "Trigger Manually"
                  )}
                </button>
              </div>

              {/* Comment Generation Job */}
              <div className="border border-[var(--tui-border)] p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[var(--tui-primary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[var(--tui-primary)] font-mono text-sm">Generate Comments</h3>
                    <p className="tui-muted">Once daily</p>
                  </div>
                </div>
                <p className="tui-muted">
                  Generates AI comments on the latest daily edition articles.
                </p>
                <div>
                  <label className="tui-label block mb-1">
                    Number of Comments to Generate
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numComments}
                    onChange={(e) =>
                      setNumComments(parseInt(e.target.value) || 1)
                    }
                    className="tui-input"
                  />
                </div>
                <button
                  onClick={() => triggerJob("comments", numComments)}
                  disabled={jobTriggering === "comments" || !isAdmin}
                  className={`tui-btn w-full text-center ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {jobTriggering === "comments" ? "Generating..." : "Generate Comments"}
                </button>
              </div>

              {/* Event Generation Job */}
              <div className="border border-[var(--tui-border)] p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[var(--tui-primary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[var(--tui-primary)] font-mono text-sm">Generate Events</h3>
                    <p className="tui-muted">Every 30 minutes</p>
                  </div>
                </div>
                <p className="tui-muted">
                  Identifies and tracks news events from social media.
                </p>
                <button
                  onClick={() => triggerJob("events")}
                  disabled={jobTriggering === "events" || !isAdmin}
                  className={`tui-btn w-full text-center ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {jobTriggering === "events" ? "Generating..." : "Generate Events"}
                </button>
              </div>

              {/* Prism Daily Edition Job */}
              <div className="border border-[var(--tui-border)] p-4 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 border border-[var(--tui-border)] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--tui-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[var(--tui-primary)] font-mono text-sm">Generate Prism Daily</h3>
                    <p className="tui-muted">Once daily at 8:30am</p>
                  </div>
                </div>
                <p className="tui-muted">
                  Generates a pair of opposing daily editions using AI-determined editorial perspectives.
                </p>
                <button
                  onClick={() => triggerJob("prism-daily")}
                  disabled={jobTriggering === "prism-daily" || !isAdmin}
                  className={`tui-btn w-full text-center ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {jobTriggering === "prism-daily" ? "Generating..." : "Trigger Manually"}
                </button>
              </div>
            </div>

            {/* Job Status Information */}
            {jobStatus && (
              <div className="space-y-4">
                <h3 className="tui-section-title">Job Status</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Reporter Job Status */}
                  <div className="border border-[var(--tui-border)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--tui-primary)] font-mono text-sm">
                        Article Generation
                      </span>
                      <div className="flex items-center space-x-2">
                        {jobStatus.status.reporterJob ? (
                          <span className="text-[#ffb000] font-mono text-xs">[RUNNING]</span>
                        ) : (
                          <span className="text-[var(--tui-primary)] font-mono text-xs">[IDLE]</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 tui-muted">
                      <div>
                        Last run:{" "}
                        {jobStatus.lastRuns.reporterJob
                          ? jobStatus.lastRuns.reporterJob.toLocaleString()
                          : "Never"}
                      </div>
                      <div>
                        Next run:{" "}
                        {jobStatus.nextRuns.reporterJob
                          ? jobStatus.nextRuns.reporterJob.toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Newspaper Job Status */}
                  <div className="border border-[var(--tui-border)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--tui-primary)] font-mono text-sm">
                        Newspaper Edition
                      </span>
                      <div className="flex items-center space-x-2">
                        {jobStatus.status.newspaperJob ? (
                          <span className="text-[#ffb000] font-mono text-xs">[RUNNING]</span>
                        ) : (
                          <span className="text-[var(--tui-primary)] font-mono text-xs">[IDLE]</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 tui-muted">
                      <div>
                        Last run:{" "}
                        {jobStatus.lastRuns.newspaperJob
                          ? jobStatus.lastRuns.newspaperJob.toLocaleString()
                          : "Never"}
                      </div>
                      <div>
                        Next run:{" "}
                        {jobStatus.nextRuns.newspaperJob
                          ? jobStatus.nextRuns.newspaperJob.toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Daily Job Status */}
                  <div className="border border-[var(--tui-border)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--tui-primary)] font-mono text-sm">
                        Daily Edition
                      </span>
                      <div className="flex items-center space-x-2">
                        {jobStatus.status.dailyJob ? (
                          <span className="text-[#ffb000] font-mono text-xs">[RUNNING]</span>
                        ) : (
                          <span className="text-[var(--tui-primary)] font-mono text-xs">[IDLE]</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 tui-muted">
                      <div>
                        Last run:{" "}
                        {jobStatus.lastRuns.dailyJob
                          ? jobStatus.lastRuns.dailyJob.toLocaleString()
                          : "Never"}
                      </div>
                      <div>
                        Next run:{" "}
                        {jobStatus.nextRuns.dailyJob
                          ? jobStatus.nextRuns.dailyJob.toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>

                {jobStatus.note && (
                  <div className="border border-[var(--tui-border)] p-4">
                    <div className="flex items-start space-x-3">
                      <svg
                        className="w-5 h-5 text-[var(--tui-primary)] mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <h4 className="text-[var(--tui-primary)] font-mono text-sm">Note</h4>
                        <p className="tui-muted mt-1">
                          {jobStatus.note}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[#335533] font-mono text-sm">
          <p>{appName} Editor Configuration Panel</p>
        </div>
      </div>
    </div>
  );
}