"use client";

export default function SourceMessageCard({
  did,
  rkey,
  text,
}: {
  did: string;
  rkey: string;
  text: string;
}) {
  const bskyUrl = did && rkey ? `https://bsky.app/profile/${did}/post/${rkey}` : null;
  const Content = (
    <div className="flex items-start gap-2">
      {bskyUrl && (
        <svg className="w-4 h-4 text-blue-300 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
      <div>
        <p className="text-sm text-white/80 line-clamp-2">{text}</p>
        {bskyUrl && (
          <p className="text-xs text-white/50 mt-1">{did.slice(0, 12)}…/{rkey.slice(0, 8)}…</p>
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
        className="block p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
      >
        {Content}
      </a>
    );
  }

  return (
    <div className="block p-3 bg-white/5 border border-white/10 rounded-lg">
      {Content}
    </div>
  );
}
