import React from "react";
import AnimatedBackground from "./AnimatedBackground";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  background?: boolean;
  variant?: "glass" | "tui";
}

export default function PageContainer({
  children,
  className = "",
  maxWidth = "max-w-4xl",
  background = true,
  variant = "glass"
}: PageContainerProps) {
  const bgClass =
    variant === "tui"
      ? "min-h-screen bg-black"
      : "min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600";

  return (
    <div
      className={`${bgClass} relative overflow-hidden ${className}`}
    >
      {variant !== "tui" && background && <AnimatedBackground />}
      <div
        className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10`}
      >
        {children}
      </div>
    </div>
  );
}
