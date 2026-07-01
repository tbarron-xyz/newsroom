import React from "react";

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  sheen?: boolean;
  variant?: "glass" | "tui";
}

export default function ContentCard({
  children,
  className = "",
  sheen = false,
  variant = "tui"
}: ContentCardProps) {
  const cardClass =
    variant === "tui"
      ? "border border-[var(--tui-border)] relative overflow-hidden"
      : "backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl relative overflow-hidden";

  return (
    <div className={`${cardClass} ${className}`}>
      {variant !== "tui" && sheen && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
      )}
      {children}
    </div>
  );
}
