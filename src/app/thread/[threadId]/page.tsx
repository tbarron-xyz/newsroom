"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import PageHeader from "@/components/PageHeader";
import { apiService } from "../../services/api.service";

interface Thread {
  id: number;
  title: string;
  forumId: string;
  author: string;
  createdAt: number;
  replyCount: number;
  lastReplyTime: number;
}

interface Post {
  id: number;
  content: string;
  author: string;
  createdAt: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ThreadViewPage() {
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const threadId = params.threadId as string;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchThread();
  }, [router, threadId]);

  const fetchThread = async () => {
    try {
      const data = await apiService.get<{ thread: Thread; posts: Post[] }>(
        "/api/thread/${threadId}"
      );
      setThread(data.thread);
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load thread");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || newPost.length > 4096) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    try {
      await apiService.post(`/api/thread/${threadId}/post`, {
        content: newPost,
        author: "user"
      });

      setNewPost("");
      await fetchThread();
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="tui-theme min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 tui-spinner mx-auto"></div>
          <p className="mt-4 tui-muted">Loading thread...</p>
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
              Error Loading Thread
            </h2>
            <p className="tui-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const threadTitle = thread?.title || `Thread #${threadId}`;

  return (
    <PageContainer variant="tui">
      <ContentCard variant="tui" className="p-8 mb-8">
        <PageHeader
          variant="tui"
          title={threadTitle}
          description={`${posts.length} posts`}
        >
          <Link href="/forum" className="tui-btn">
            ← Back to Forum
          </Link>
        </PageHeader>
      </ContentCard>

      <form onSubmit={handleSubmitPost} className="mb-8">
        <ContentCard variant="tui" className="p-6">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Write a reply..."
            maxLength={4096}
            className="tui-textarea"
            rows={4}
            disabled={submitting}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="tui-text-muted" style={{ fontSize: "0.75rem" }}>
              {newPost.length}/4096 characters
            </span>
            <button
              type="submit"
              disabled={submitting || !newPost.trim()}
              className="tui-btn-primary"
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </ContentCard>
      </form>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="tui-section-card p-12 text-center">
            <p className="tui-muted">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="tui-section-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 border border-[var(--tui-border)] flex items-center justify-center">
                    <span className="text-[var(--tui-primary)] font-mono text-sm font-medium">
                      {post.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--tui-primary)] font-mono">
                    {post.author}
                  </span>
                </div>
                <span
                  className="tui-text-muted"
                  style={{ fontSize: "0.75rem" }}
                >
                  {formatDate(post.createdAt)}
                </span>
              </div>
              <div
                className="text-[var(--tui-primary)] font-mono whitespace-pre-wrap leading-relaxed"
                style={{ opacity: 0.85 }}
              >
                {post.content}
              </div>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}
