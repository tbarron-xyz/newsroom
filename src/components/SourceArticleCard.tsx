"use client";

import { useState } from "react";
import Link from "next/link";
import type { Article } from "@/app/schemas/types";

interface SourceArticleCardProps {
  article: Article;
  variant?: "glass" | "tui";
}

export default function SourceArticleCard({ article, variant = "tui" }: SourceArticleCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasSources = article.messageDids?.length > 0;

  const isTui = variant === "tui";

  return (
    <div className={isTui ? "border border-[var(--tui-border)] p-4" : "backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-4"}>
      <div className="flex justify-between items-start">
        <div>
          <Link href={`/articles/${article.id}`} className={isTui ? "font-semibold tui-link" : "font-semibold text-white/90 hover:text-white"}>
            {article.headline}
          </Link>
          <p className={isTui ? "tui-text-muted mt-1" : "text-xs text-white/60 mt-1"}>
            Reporter: {article.reporterId} | Generated: {new Date(article.generationTime).toLocaleDateString()}
          </p>
        </div>
        {hasSources && (
          <button onClick={() => setExpanded(!expanded)} className={isTui ? "text-sm tui-link" : "text-sm text-blue-300 hover:text-blue-200"}>
            {expanded ? "Hide Sources" : `View Sources (${article.messageDids.length})`}
          </button>
        )}
      </div>

      {expanded && hasSources && (
        <div className={`mt-4 space-y-2 pt-4 ${isTui ? "border-t border-[var(--tui-border)]" : "border-t border-white/10"}`}>
          {article.messageDids.map((did, i) => {
            const rkey = article.messageRkeys[i];
            const text = article.messageTexts[i];
            return (
              <a key={i}
                href={`https://bsky.app/profile/${did}/post/${rkey}`}
                target="_blank"
                rel="noopener noreferrer"
                className={isTui ? "block p-3 border border-[var(--tui-border)] hover:bg-[var(--tui-hover-bg)]" : "block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"}
              >
                <div className="flex items-start gap-2">
                  <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isTui ? "text-[var(--tui-primary)]" : "text-blue-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div>
                    <p className={isTui ? "tui-text-muted line-clamp-2" : "text-sm text-white/80 line-clamp-2"}>{text}</p>
                    <p className={`mt-1 ${isTui ? "tui-text-muted" : "text-xs text-white/50"}`}>{did.slice(0, 12)}…/{rkey.slice(0, 8)}…</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
