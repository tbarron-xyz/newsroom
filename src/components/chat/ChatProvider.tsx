"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { useRef } from "react";

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const sessionId = useRef(crypto.randomUUID()).current;

  const adapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
      const text = messages[messages.length - 1].content
        .map((p: any) => p.text)
        .join("");
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, sessionId }),
        signal: abortSignal
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Request failed");
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield {
          content: [{ type: "text", text: dec.decode(value, { stream: true }) }]
        };
      }
      dec.decode(); // flush any remaining bytes
    }
  };

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
