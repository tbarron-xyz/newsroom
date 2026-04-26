"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiService } from "@/app/services/api.service";
import { useAuth } from "@/hooks/useAuth";
import { useList } from "@/hooks/useList";

interface Reporter {
  id: string;
  beats: string[];
  prompt: string;
  enabled: boolean;
}

export default function ReportersPage() {
  const { user, loading: authLoading } = useAuth();
  const [appName, setAppName] = useState("Newsroom");
  const [editingReporter, setEditingReporter] = useState<Reporter | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newReporter, setNewReporter] = useState({
    beats: [] as string[],
    prompt: ""
  });
  const {
    data: reporters,
    setData: setReporters,
    loading,
    refetch
  } = useList<Reporter>("/api/reporters");

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

  const saveReporter = async (reporter: Reporter) => {
    setSaving(true);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setMessage("Not authenticated");
        setSaving(false);
        return;
      }
      await apiService.put(`/api/reporters/${reporter.id}`, {
        beats: reporter.beats,
        prompt: reporter.prompt
      });
      setMessage("Reporter updated successfully!");
      setEditingReporter(null);
      setTimeout(() => setMessage(""), 3000);
      refetch();
    } catch (error) {
      setMessage("Error updating reporter");
      console.error("Error updating reporter:", error);
    } finally {
      setSaving(false);
    }
  };

  const createReporter = async () => {
    setSaving(true);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setMessage("Not authenticated");
        setSaving(false);
        return;
      }
      await apiService.post("/api/reporters", newReporter);
      setMessage("Reporter created successfully!");
      setShowCreateForm(false);
      setNewReporter({ beats: [], prompt: "" });
      setTimeout(() => setMessage(""), 3000);
      refetch();
    } catch (error) {
      setMessage("Error creating reporter");
      console.error("Error creating reporter:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteReporter = async (reporterId: string) => {
    if (!confirm("Are you sure you want to delete this reporter?")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setMessage("Not authenticated");
        setSaving(false);
        return;
      }
      await apiService.delete(`/api/reporters/${reporterId}`);
      setMessage("Reporter deleted successfully!");
      setTimeout(() => setMessage(""), 3000);
      refetch();
    } catch (error) {
      setMessage("Error deleting reporter");
      console.error("Error deleting reporter:", error);
    } finally {
      setSaving(false);
    }
  };

  const addBeat = (reporter: Reporter, beat: string) => {
    if (beat.trim() && !reporter.beats.includes(beat.trim())) {
      const updatedReporter = {
        ...reporter,
        beats: [...reporter.beats, beat.trim()]
      };
      setReporters(
        reporters.map((r) => (r.id === reporter.id ? updatedReporter : r))
      );
      if (editingReporter?.id === reporter.id) {
        setEditingReporter(updatedReporter);
      }
    }
  };

  const removeBeat = (reporter: Reporter, beatToRemove: string) => {
    const updatedReporter = {
      ...reporter,
      beats: reporter.beats.filter((beat) => beat !== beatToRemove)
    };
    setReporters(
      reporters.map((r) => (r.id === reporter.id ? updatedReporter : r))
    );
    if (editingReporter?.id === reporter.id) {
      setEditingReporter(updatedReporter);
    }
  };

  const addNewBeat = (beat: string) => {
    if (beat.trim() && !newReporter.beats.includes(beat.trim())) {
      setNewReporter({
        ...newReporter,
        beats: [...newReporter.beats, beat.trim()]
      });
    }
  };

  const removeNewBeat = (beatToRemove: string) => {
    setNewReporter({
      ...newReporter,
      beats: newReporter.beats.filter((beat) => beat !== beatToRemove)
    });
  };

  const toggleReporterStatus = async (reporterId: string) => {
    setSaving(true);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setMessage("Not authenticated");
        setSaving(false);
        return;
      }
      const data = await apiService.post<any>(
        `/api/reporters/${reporterId}/toggle`
      );
      setMessage(data.message);
      setTimeout(() => setMessage(""), 3000);
      refetch();
    } catch (error) {
      setMessage("Error toggling reporter status");
      console.error("Error toggling reporter status:", error);
    } finally {
      setSaving(false);
    }
  };

  // Check permissions
  const hasReporterPermission = user?.hasReporter === true;
  const hasEditorPermission = user?.hasEditor === true;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 py-8 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-400/20 animate-pulse duration-3000"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-gray-400/30 to-gray-500/30 rounded-full blur-3xl duration-3000"></div>
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-gray-500/30 to-gray-400/30 rounded-full blur-3xl duration-3000"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Reporter Management
            </h1>
            <p className="text-white/80 text-lg">
              Manage reporters, their beats, and writing prompts
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-medium"
            >
              ← Back to Editor
            </Link>
          </div>
        </div>

        {/* Create New Reporter Button */}
        <div className="mb-6">
          {hasReporterPermission ? (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-400 hover:to-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition-all duration-300 font-medium flex items-center space-x-2 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {showCreateForm ? "Cancel" : "Create New Reporter"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <svg
                className="w-5 h-5 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          ) : (
            <div className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 rounded-xl font-medium flex items-center space-x-2 cursor-not-allowed">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Create New Reporter (Requires Reporter Permission)</span>
            </div>
          )}
        </div>

        {/* Create Reporter Form */}
        {showCreateForm && (
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 mb-8 space-y-6 relative overflow-hidden">
            {/* Sheen effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
            <h2 className="text-2xl font-semibold text-white relative z-10">
              Create New Reporter
            </h2>

            {/* Beats Section */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-purple-300"
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
                <h3 className="text-xl font-semibold text-white">Beats</h3>
              </div>

              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {newReporter.beats.map((beat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-200 border border-purple-400/30"
                    >
                      {beat}
                      <button
                        onClick={() => removeNewBeat(beat)}
                        className="ml-2 text-purple-300 hover:text-purple-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add a beat (e.g., Technology, Politics)"
                    className="flex-1 px-4 py-3 high-contrast-input"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addNewBeat((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget
                        .previousElementSibling as HTMLInputElement;
                      addNewBeat(input.value);
                      input.value = "";
                    }}
                    className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-400 hover:to-purple-500 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                  >
                    <span className="relative z-10">Add</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-300"
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
                <h3 className="text-xl font-semibold text-white">
                  Writing Prompt
                </h3>
              </div>

              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6">
                <textarea
                  value={newReporter.prompt}
                  onChange={(e) =>
                    setNewReporter({ ...newReporter, prompt: e.target.value })
                  }
                  placeholder="Enter the reporter's writing guidelines and prompt..."
                  className="high-contrast-input w-full h-32 p-4 rounded-xl resize-vertical"
                  rows={4}
                />
                <p className="text-sm text-white/70 mt-2">
                  Define the reporter's writing guidelines and prompt.
                </p>
              </div>
            </div>

            {/* Create Button */}
            <div className="flex justify-end relative z-10">
              <button
                onClick={createReporter}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-400 hover:to-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 font-medium flex items-center space-x-2 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {saving ? "Creating..." : "Create Reporter"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                {!saving && (
                  <svg
                    className="w-4 h-4 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white relative z-10"></div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`backdrop-blur-sm mb-6 px-6 py-4 rounded-xl text-center font-medium relative z-10 ${
              message.includes("successfully")
                ? "bg-green-500/20 border border-green-400/30 text-green-300"
                : "bg-red-500/20 border border-red-400/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* Reporters List */}
        <div className="space-y-6">
          {reporters.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-12 text-center relative overflow-hidden">
              {/* Sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-white/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">
                  No Reporters Found
                </h3>
                <p className="text-white/70 text-lg">
                  Create your first reporter to get started.
                </p>
              </div>
            </div>
          ) : (
            reporters.map((reporter) => (
              <div
                key={reporter.id}
                className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden"
              >
                {/* Sheen effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${reporter.enabled ? "bg-blue-500/20 border border-blue-400/30" : "bg-gray-500/20 border border-gray-400/30"}`}
                    >
                      <svg
                        className={`w-5 h-5 ${reporter.enabled ? "text-blue-300" : "text-gray-400"}`}
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
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`text-xl font-semibold ${reporter.enabled ? "text-white" : "text-white/60"}`}
                        >
                          Reporter {reporter.id.split("_")[2] || reporter.id}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            reporter.enabled
                              ? "bg-green-500/20 text-green-300 border border-green-400/30"
                              : "bg-red-500/20 text-red-300 border border-red-400/30"
                          }`}
                        >
                          {reporter.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-white/70">
                        {reporter.beats.length} beat
                        {reporter.beats.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 relative z-10">
                    <Link
                      href={`/articles?reporterId=${reporter.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-400 hover:to-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition-all duration-300 font-medium flex items-center space-x-1 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 relative overflow-hidden group"
                    >
                      <span className="relative z-10">View Articles</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <svg
                        className="w-4 h-4 relative z-10"
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
                    </Link>
                    {hasEditorPermission ? (
                      <button
                        onClick={() => toggleReporterStatus(reporter.id)}
                        disabled={saving}
                        className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium flex items-center space-x-1 transform hover:scale-105 hover:shadow-lg relative overflow-hidden group ${
                          reporter.enabled
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 hover:shadow-orange-500/25"
                            : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 hover:shadow-green-500/25"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span className="relative z-10">
                          {reporter.enabled ? "Disable" : "Enable"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        <svg
                          className="w-4 h-4 relative z-10"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              reporter.enabled
                                ? "M13 10V3L4 14h7v7l9-11h-7z"
                                : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            }
                          />
                        </svg>
                      </button>
                    ) : null}
                    {hasReporterPermission ? (
                      <button
                        onClick={() =>
                          setEditingReporter(
                            editingReporter?.id === reporter.id
                              ? null
                              : reporter
                          )
                        }
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-400 hover:to-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-300 font-medium transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 relative overflow-hidden group"
                      >
                        <span className="relative z-10">
                          {editingReporter?.id === reporter.id
                            ? "Cancel"
                            : "Edit"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 rounded-xl font-medium cursor-not-allowed">
                        Edit
                      </div>
                    )}
                    {hasReporterPermission ? (
                      <button
                        onClick={() => deleteReporter(reporter.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-400 hover:to-red-500 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 relative overflow-hidden group"
                      >
                        <span className="relative z-10">Delete</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </button>
                    ) : (
                      <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 rounded-xl font-medium cursor-not-allowed">
                        Delete
                      </div>
                    )}
                  </div>
                </div>

                {/* Beats Display */}
                <div className="mb-6 relative z-10">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Beats
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {reporter.beats.map((beat, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-200 border border-purple-400/30"
                      >
                        {beat}
                        {editingReporter?.id === reporter.id && (
                          <button
                            onClick={() => removeBeat(reporter, beat)}
                            className="ml-2 text-purple-300 hover:text-purple-100"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {reporter.beats.length === 0 && (
                      <span className="text-white/60 italic">
                        No beats assigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Prompt Display */}
                <div className="mb-6 relative z-10">
                  <div className="flex items-center gap-2 mb-3 relative group">
                    <h4 className="text-lg font-semibold text-white">
                      Writing Prompt
                    </h4>
                    <div className="relative group">
                      <svg
                        className="w-4 h-4 text-white/60 hover:text-white/80 cursor-help"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        To ensure full journalistic transparency, this is the
                        exact prompt given to the AI model to guide this
                        reporter's writing. This allows the user to verify that
                        no funny business has taken place.
                      </div>
                    </div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4">
                    {reporter.prompt ? (
                      <p className="text-white/90 whitespace-pre-wrap">
                        {reporter.prompt}
                      </p>
                    ) : (
                      <p className="text-white/60 italic">No prompt set</p>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                {editingReporter?.id === reporter.id && (
                  <div className="border-t border-white/20 pt-6 space-y-6 relative z-10">
                    <h4 className="text-lg font-semibold text-white">
                      Edit Reporter
                    </h4>

                    {/* Add Beat Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white/80">
                        Add Beat
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Add a new beat"
                          className="flex-1 px-4 py-3 high-contrast-input"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              addBeat(
                                reporter,
                                (e.target as HTMLInputElement).value
                              );
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget
                              .previousElementSibling as HTMLInputElement;
                            addBeat(reporter, input.value);
                            input.value = "";
                          }}
                          className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-400 hover:to-purple-500 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                        >
                          <span className="relative z-10">Add</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        </button>
                      </div>
                    </div>

                    {/* Edit Prompt */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white/80">
                        Writing Prompt
                      </label>
                      <textarea
                        value={editingReporter.prompt}
                        onChange={(e) =>
                          setEditingReporter({
                            ...editingReporter,
                            prompt: e.target.value
                          })
                        }
                        className="high-contrast-input w-full h-32 p-4 rounded-xl resize-vertical"
                        rows={4}
                      />
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setEditingReporter(null)}
                        className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveReporter(editingReporter)}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-400 hover:to-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 font-medium flex items-center space-x-2 relative overflow-hidden group"
                      >
                        <span className="relative z-10">
                          {saving ? "Saving..." : "Save Changes"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        {!saving && (
                          <svg
                            className="w-4 h-4 relative z-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {saving && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white relative z-10"></div>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/60 relative z-10">
          <p>{appName} Reporter Management Panel</p>
        </div>
      </div>
    </div>
  );
}
