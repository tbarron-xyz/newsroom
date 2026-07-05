"use client";

import { useState, useEffect, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  breakpoint?: number;
}

export default function CollapsibleSection({
  title,
  children,
  breakpoint = 1024
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setCollapsed(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  if (isDesktop) {
    return (
      <>
        <h2 className="text-lg font-bold text-[var(--tui-primary)] mb-4">
          {title}
        </h2>
        {children}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left text-lg font-bold text-[var(--tui-primary)] flex items-center justify-between"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-[var(--tui-muted)] transition-transform ${collapsed ? "" : "rotate-90"}`}
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
      </button>
      {!collapsed && <div className="mt-4">{children}</div>}
    </>
  );
}
