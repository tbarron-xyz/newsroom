"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "../schemas/types";
import { apiService } from "@/app/services/api.service";
import { useAuth } from "@/hooks/useAuth";
import { useList } from "@/hooks/useList";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";

interface SafeUser {
  id: string;
  email: string;
  role: "admin" | "editor" | "reporter";
  createdAt: number;
  lastLoginAt?: number;
}

export default function UsersPage() {
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { data: users, loading, refetch } = useList<SafeUser>("/api/users");

  if (authLoading || loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)] p-6 text-center">
          <p className="tui-muted">Please log in to access this page.</p>
          <Link
            href="/login"
            className="inline-block mt-4 tui-btn-primary no-underline"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)] p-6 text-center">
          <h2 className="text-xl font-semibold text-[var(--tui-primary)] font-mono mb-2">
            Access Denied
          </h2>
          <p className="tui-muted">Admin access required.</p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-[color-mix(in_srgb,var(--tui-primary)_20%,transparent)] text-[var(--tui-primary)] border border-[color-mix(in_srgb,var(--tui-primary)_30%,transparent)]";
      case "editor":
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      case "reporter":
        return "bg-green-500/20 text-green-300 border border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
    }
  };

  const handleGenerateEvents = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const result = await apiService.post<any>("/api/events/generate");
      alert(
        `Events generated successfully! Created ${result.totalGenerated} events.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate events"
      );
    }
  };

  if (error) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="tui-msg-error mb-4">{error}</div>
          <button onClick={() => setError(null)} className="tui-btn">
            Dismiss
          </button>
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
            title="User Management"
            description="View and manage all users in the system"
          >
            <button
              onClick={handleGenerateEvents}
              disabled={loading}
              className="tui-btn-primary"
            >
              Generate Events
            </button>
            <Link href="/events" className="tui-btn no-underline">
              View Events
            </Link>
          </PageHeader>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--tui-border)]">
                <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-mono text-[var(--tui-primary)] uppercase tracking-wider">
                  Last Login
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--tui-border)] hover:bg-[var(--tui-hover-bg)] transition-colors duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tui-text-primary">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold font-mono rounded-full ${getRoleBadgeColor(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tui-text-muted">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tui-text-muted">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="border-t border-[var(--tui-border)] p-12 text-center">
            <p className="tui-text-muted">No users found</p>
          </div>
        )}
      </ContentCard>
    </PageContainer>
  );
}
