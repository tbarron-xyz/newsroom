"use client";

import { AssistantModalPrimitive } from "@assistant-ui/react";
import { Thread } from "./thread";

export function AssistantModal() {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Trigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 transition-colors flex items-center justify-center shadow-lg"
          aria-label="Open chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      </AssistantModalPrimitive.Trigger>

      <AssistantModalPrimitive.Content
        sideOffset={0}
        className="fixed bottom-24 right-6 z-50 w-[400px] h-[560px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white/90 text-sm font-semibold">
            Ask about today's edition
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}
