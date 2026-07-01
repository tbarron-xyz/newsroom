"use client";

interface SourceMessageCardProps {
  did: string;
  rkey: string;
  text: string;
  variant?: "glass" | "tui";
}

export default function SourceMessageCard({
  did,
  rkey,
  text,
  variant = "tui"
}: SourceMessageCardProps) {
  const bskyUrl = did && rkey ? `https://bsky.app/profile/${did}/post/${rkey}` : null;
  const isTui = variant === "tui";

  const Content = (
    <div className="flex items-start gap-2">
      {bskyUrl && (
        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isTui ? "text-[var(--tui-primary)]" : "text-blue-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
      <div>
        <p className={`text-sm line-clamp-2 ${isTui ? "text-[var(--tui-muted)]" : "text-white/80"}`}>{text}</p>
        {bskyUrl && (
          <p className={`text-xs mt-1 ${isTui ? "text-[var(--tui-muted)]" : "text-white/50"}`}>{did.slice(0, 12)}…/{rkey.slice(0, 8)}…</p>
        )}
      </div>
    </div>
  );

  if (bskyUrl) {
    return (
      <a
        href={bskyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block p-3 transition-colors ${isTui ? "border border-[var(--tui-border)] hover:bg-[var(--tui-hover-bg)]" : "bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"}`}
      >
        {Content}
      </a>
    );
  }

  return (
    <div className={`block p-3 ${isTui ? "border border-[var(--tui-border)]" : "bg-white/5 border border-white/10 rounded-lg"}`}>
      {Content}
    </div>
  );
}
