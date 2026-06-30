import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "glass" | "tui";
}

export default function PageHeader({
  title,
  description,
  children,
  className = "",
  variant = "glass"
}: PageHeaderProps) {
  const titleClass =
    variant === "tui"
      ? "text-4xl font-bold font-mono text-[var(--tui-primary)] mb-2"
      : "text-4xl font-bold text-white mb-2 drop-shadow-lg";

  const descClass =
    variant === "tui"
      ? "text-[var(--tui-muted)] font-mono text-lg"
      : "text-white/80 text-lg";

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h1 className={titleClass}>{title}</h1>
        {description && <p className={descClass}>{description}</p>}
      </div>
      {children && (
        <div className="flex items-center space-x-4">{children}</div>
      )}
    </div>
  );
}
