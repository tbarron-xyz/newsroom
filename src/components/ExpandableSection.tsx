import React from "react";

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  variant?: "glass" | "tui";
}

export default function ExpandableSection({
  title,
  children,
  expanded,
  onToggle,
  className = "",
  variant = "tui"
}: ExpandableSectionProps) {
  return (
    <div className={className}>
      <button
        onClick={onToggle}
        className={`flex items-center text-sm font-medium transition-colors ${variant === "tui" ? "text-[var(--tui-muted)] hover:text-[var(--tui-primary)]" : "text-white/70 hover:text-white"}`}
      >
        <svg
          className={`w-4 h-4 mr-2 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        {expanded ? `Hide ${title}` : `Show ${title}`}
      </button>

      {expanded && <div className="mt-4">{children}</div>}
    </div>
  );
}
