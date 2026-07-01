"use client";

import { useState, useEffect, useRef } from "react";
import { apiService } from "@/app/services/api.service";

export default function Ticker() {
  const [text, setText] = useState("");
  const [duration, setDuration] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const data = await apiService.get<{ text: string }>("/api/ticker");
        if (data.text) {
          setText(data.text);
          setDuration(Math.max(30, data.text.length * 0.3));
        }
      } catch {
        console.log("No ticker available yet");
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!text) return null;

  return (
    <div className="w-full overflow-hidden bg-gray-900/80 border-b border-[var(--tui-border)] h-7 flex items-center relative z-20">
      <div className="flex" ref={containerRef}>
        <div
          className="flex whitespace-nowrap ticker-scroll"
          style={{ animationDuration: `${duration}s` }}
        >
          <span className="text-[#ffb000] font-mono text-xs leading-7 px-4">
            {text}
          </span>
          <span className="text-[#ffb000] font-mono text-xs leading-7 px-4">
            {text}
          </span>
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-scroll {
          animation: ticker-scroll linear infinite;
        }
      `}</style>
    </div>
  );
}
