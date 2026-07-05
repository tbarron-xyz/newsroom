"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
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

  const generateArticle = async (reporterId: string) => {
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
        `/api/reporters/${reporterId}/generate-article`
      );
      setMessage(data.message);
      setTimeout(() => setMessage(""), 6000);
    } catch (error) {
      setMessage("Error generating article");
      console.error("Error generating article:", error);
    } finally {
      setSaving(false);
    }
  };

  // Check permissions
  const hasReporterPermission = user?.hasReporter === true;
  const hasEditorPermission = user?.hasEditor === true;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="tui-spinner mx-auto"></div>
          <p className="tui-muted mt-4">Loading reporters...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="max-w-6xl">
      <PageHeader
        title="Reporter Management"
        description="Manage reporters, their beats, and writing prompts"
      >
        <Link href="/" className="tui-btn px-6 py-3">
          ← Back to Editor
        </Link>
      </PageHeader>

      <div className="mt-8">

        {/* Create New Reporter Button */}
        <div className="mb-6">
          {hasReporterPermission ? (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="tui-btn-primary px-6 py-3 flex items-center space-x-2"
            >
              <span>{showCreateForm ? "Cancel" : "Create New Reporter"}</span>
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
            </button>
          ) : (
            <div className="tui-btn opacity-50 cursor-not-allowed inline-flex items-center space-x-2 px-6 py-3">
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
          <ContentCard className="p-6 mb-8 space-y-6">
            <h2 className="tui-section-title">Create New Reporter</h2>

            {/* Beats Section */}
            <div className="space-y-4">
              <h3 className="tui-section-title">Beats</h3>

              <div className="border border-[var(--tui-border)] p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {newReporter.beats.map((beat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 text-sm border border-[var(--tui-border)] text-[var(--tui-primary)]"
                    >
                      {beat}
                      <button
                        onClick={() => removeNewBeat(beat)}
                        className="ml-2 text-[var(--tui-muted)] hover:text-[var(--tui-primary)]"
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
                    className="tui-input flex-1"
                    onKeyDown={(e) => {
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
                    className="tui-btn-primary px-4 py-3"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="space-y-4">
              <h3 className="tui-section-title">Writing Prompt</h3>

              <div className="border border-[var(--tui-border)] p-4">
                <textarea
                  value={newReporter.prompt}
                  onChange={(e) =>
                    setNewReporter({ ...newReporter, prompt: e.target.value })
                  }
                  placeholder="Enter the reporter's writing guidelines and prompt..."
                  className="tui-input w-full h-32 resize-vertical"
                  rows={4}
                />
                <p className="tui-muted mt-2">
                  Define the reporter's writing guidelines and prompt.
                </p>
              </div>
            </div>

            {/* Create Button */}
            <div className="flex justify-end">
              <button
                onClick={createReporter}
                disabled={saving}
                className="tui-btn-primary px-8 py-3 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{saving ? "Creating..." : "Create Reporter"}</span>
                {!saving && (
                  <svg
                    className="w-4 h-4"
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                )}
              </button>
            </div>
          </ContentCard>
        )}

        {/* Message */}
        {message && (
          <div
            className={`mb-6 px-6 py-4 text-center font-mono ${
              message.includes("successfully")
                ? "tui-msg-success"
                : "tui-msg-error"
            }`}
          >
            {message}
          </div>
        )}

        {/* Reporters List */}
        <div className="space-y-6">
          {reporters.length === 0 ? (
            <ContentCard className="p-12 text-center">
              <div className="w-16 h-16 border border-[var(--tui-border)] flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-[var(--tui-muted)]"
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
              <h3 className="tui-text-primary text-2xl mb-3">
                No Reporters Found
              </h3>
              <p className="tui-text-muted text-lg">
                Create your first reporter to get started.
              </p>
            </ContentCard>
          ) : (
            reporters.map((reporter) => (
              <ContentCard key={reporter.id} className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 border flex items-center justify-center ${
                        reporter.enabled
                          ? "border-[var(--tui-primary)] text-[var(--tui-primary)]"
                          : "border-[var(--tui-border)] text-[var(--tui-muted)]"
                      }`}
                    >
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`text-xl font-mono ${
                            reporter.enabled
                              ? "text-[var(--tui-primary)]"
                              : "text-[var(--tui-muted)]"
                          }`}
                        >
                          Reporter {reporter.id.split("_")[2] || reporter.id}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border ${
                            reporter.enabled
                              ? "border-[var(--tui-primary)] text-[var(--tui-primary)]"
                              : "border-[var(--tui-border)] text-[var(--tui-muted)]"
                          }`}
                        >
                          {reporter.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="tui-text-muted">
                        {reporter.beats.length} beat
                        {reporter.beats.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/articles?reporterId=${reporter.id}`}
                      className="tui-btn-primary px-4 py-2 flex items-center space-x-1"
                    >
                      <span>View Articles</span>
                      <svg
                        className="w-4 h-4"
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
                        className={`px-4 py-2 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                          reporter.enabled ? "tui-btn-danger" : "tui-btn-primary"
                        }`}
                      >
                        <span>
                          {reporter.enabled ? "Disable" : "Enable"}
                        </span>
                        <svg
                          className="w-4 h-4"
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
                        onClick={() => generateArticle(reporter.id)}
                        disabled={saving}
                        className="tui-btn-primary px-4 py-2 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Generate Article</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                    ) : (
                      <div className="tui-btn opacity-50 cursor-not-allowed px-4 py-2">
                        Generate Article (Requires Reporter Permission)
                      </div>
                    )}
                    {hasReporterPermission ? (
                      <button
                        onClick={() =>
                          setEditingReporter(
                            editingReporter?.id === reporter.id
                              ? null
                              : reporter
                          )
                        }
                        className={`tui-btn px-4 py-2 ${editingReporter?.id === reporter.id ? "tui-btn-danger" : ""}`}
                      >
                        {editingReporter?.id === reporter.id
                          ? "Cancel"
                          : "Edit"}
                      </button>
                    ) : (
                      <div className="tui-btn opacity-50 cursor-not-allowed px-4 py-2">
                        Edit
                      </div>
                    )}
                    {hasReporterPermission ? (
                      <button
                        onClick={() => deleteReporter(reporter.id)}
                        disabled={saving}
                        className="tui-btn-danger px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    ) : (
                      <div className="tui-btn opacity-50 cursor-not-allowed px-4 py-2">
                        Delete
                      </div>
                    )}
                  </div>
                </div>

                {/* Beats Display */}
                <div className="mb-6">
                  <h4 className="tui-section-title mb-3">Beats</h4>
                  <div className="flex flex-wrap gap-2">
                    {reporter.beats.map((beat, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 text-sm border border-[var(--tui-border)] text-[var(--tui-primary)]"
                      >
                        {beat}
                        {editingReporter?.id === reporter.id && (
                          <button
                            onClick={() => removeBeat(reporter, beat)}
                            className="ml-2 text-[var(--tui-muted)] hover:text-[var(--tui-primary)]"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {reporter.beats.length === 0 && (
                      <span className="tui-text-muted italic">
                        No beats assigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Prompt Display */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 relative group">
                    <h4 className="tui-section-title">Writing Prompt</h4>
                    <div className="relative group">
                      <svg
                        className="w-4 h-4 text-[var(--tui-muted)] hover:text-[var(--tui-primary)] cursor-help"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border border-[var(--tui-border)]">
                        To ensure full journalistic transparency, this is the
                        exact prompt given to the AI model to guide this
                        reporter's writing. This allows the user to verify that
                        no funny business has taken place.
                      </div>
                    </div>
                  </div>
                  <div className="border border-[var(--tui-border)] p-4">
                    {reporter.prompt ? (
                      <p className="tui-text-muted whitespace-pre-wrap">
                        {reporter.prompt}
                      </p>
                    ) : (
                      <p className="tui-text-muted italic">No prompt set</p>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                {editingReporter?.id === reporter.id && (
                  <div className="border-t border-[var(--tui-border)] pt-6 space-y-6">
                    <h4 className="tui-section-title">Edit Reporter</h4>

                    {/* Add Beat Input */}
                    <div>
                      <label className="tui-label block mb-2">
                        Add Beat
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Add a new beat"
                          className="tui-input flex-1"
                          onKeyDown={(e) => {
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
                          className="tui-btn-primary px-4 py-3"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Edit Prompt */}
                    <div>
                      <label className="tui-label block mb-2">
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
                        className="tui-input w-full h-32 resize-vertical"
                        rows={4}
                      />
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setEditingReporter(null)}
                        className="tui-btn px-6 py-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveReporter(editingReporter)}
                        disabled={saving}
                        className="tui-btn-primary px-6 py-3 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>
                          {saving ? "Saving..." : "Save Changes"}
                        </span>
                        {!saving && (
                          <svg
                            className="w-4 h-4"
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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </ContentCard>
            ))
          )}
        </div>

        <div className="text-center mt-12 tui-muted">
          <p>Reporter Management Panel</p>
        </div>
      </div>
    </PageContainer>
  );
}
