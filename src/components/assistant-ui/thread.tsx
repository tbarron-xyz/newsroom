"use client";

import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useThreadRuntime,
  useAuiState
} from "@assistant-ui/react";

export function Thread({
  textareaRef
}: {
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const threadRuntime = useThreadRuntime();
  const messages = useAuiState((s) => s.thread.messages);
  const userCount = messages.filter((m) => m.role === "user").length;
  const isEnded = userCount >= 3;

  return (
    <ThreadPrimitive.Root className="flex flex-col h-full min-h-0">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <ThreadPrimitive.Messages>
          {(msg) => {
            if (
              msg.message.role === "user" ||
              msg.message.role === "assistant"
            ) {
              const isUser = msg.message.role === "user";
              return (
                <MessagePrimitive.Root
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isUser
                        ? "bg-blue-500/20 text-white"
                        : "bg-white/10 text-white/90"
                    }`}
                  >
                    <MessagePrimitive.Content />
                  </div>
                </MessagePrimitive.Root>
              );
            }
            return null;
          }}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="mt-auto">
          {isEnded ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-white/50 text-sm">
                Conversation ended (max 3 messages)
              </p>
              <button
                onClick={() => threadRuntime.reset()}
                className="px-4 py-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl text-white/90 hover:bg-white/20 transition-colors text-sm"
              >
                New conversation
              </button>
            </div>
          ) : (
            <ComposerPrimitive.Root className="flex items-end gap-2 border-t border-white/10 p-3">
              <ComposerPrimitive.Input
                ref={textareaRef}
                className="flex-1 resize-none rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:border-white/40"
              />
              <ComposerPrimitive.Send className="shrink-0 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 transition-colors text-sm disabled:opacity-40" />
            </ComposerPrimitive.Root>
          )}
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
