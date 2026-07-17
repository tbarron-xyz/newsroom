"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ContentCard from "./ContentCard";
import CollapsibleSection from "./CollapsibleSection";
import type { HomepageChatMessage } from "../app/schemas/types";

export default function HomepageChat() {
  const [messages, setMessages] = useState<HomepageChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef("");

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/homepage-chat");
      if (res.ok) {
        const data = await res.json();
        const hash = JSON.stringify(data.messages);
        if (hash === messagesRef.current) return;
        messagesRef.current = hash;
        setMessages(data.messages);
      }
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    const value = input.trim();
    if (!value) return;

    setInput("");
    setError(null);

    try {
      const res = await fetch("/api/homepage-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message");
        return;
      }

      const data = await res.json();
      messagesRef.current = JSON.stringify(data.messages);
      setMessages(data.messages);
    } catch {
      setError("Failed to send message");
    }
  };

  return (
    <ContentCard variant="tui" className="p-4">
      <CollapsibleSection title="Chat">
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            lineHeight: "1.4"
          }}
        >
          <div
            ref={scrollRef}
            style={{
              maxHeight: 200,
              overflowY: "auto",
              marginBottom: 4
            }}
          >
            {messages.length === 0 && (
              <div className="tui-muted">No messages yet.</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="leading-tight">
                <span
                  style={{
                    color:
                      msg.type === "assistant"
                        ? "var(--tui-primary-dim)"
                        : "var(--tui-primary)"
                  }}
                >
                  {msg.senderName}:{" "}
                </span>
                <span style={{ color: "var(--tui-muted)" }}>{msg.content}</span>
              </div>
            ))}
          </div>
          {error && (
            <div
              style={{
                color: "#ff6b6b",
                fontSize: 9,
                marginBottom: 2
              }}
            >
              {error}
            </div>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent border-t border-[var(--tui-border)] pt-1 outline-none tui-muted"
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              lineHeight: "1.4"
            }}
          />
        </div>
      </CollapsibleSection>
    </ContentCard>
  );
}
