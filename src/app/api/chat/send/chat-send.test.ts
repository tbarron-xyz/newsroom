import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

function mockStreamResult(text: string) {
  return {
    stream: (async function* () {
      yield { type: "text-delta" as const, text };
    })()
  };
}

const mockEdition = {
  id: "daily_test_1",
  editions: ["edition_1"],
  generationTime: Date.now(),
  frontPageHeadline: "Test Daily News",
  frontPageArticle: "Top story of the day for testing.",
  newspaperName: "Test Times",
  topics: [
    {
      name: "Politics",
      headline: "Political Headline",
      newsStoryFirstParagraph: "First paragraph of politics story.",
      newsStorySecondParagraph: "Second paragraph of politics story.",
      oneLineSummary: "Summary of political news."
    }
  ],
  prompt: "Compile a daily edition",
  modelName: "gpt-4"
};

const mockEditor = {
  bio: "Test editor",
  prompt: "You are a test editor",
  modelName: "gpt-4",
  articleModelName: "gpt-4",
  eventModelName: "gpt-4",
  storySelectionModelName: "gpt-4",
  editionSelectionModelName: "gpt-4",
  chatModelName: "gpt-4",
  messageSliceCount: 10,
  inputTokenCost: 2.5,
  outputTokenCost: 10,
  baseUrl: "https://api.openai.com/v1",
  articleGenerationPeriodMinutes: 15,
  lastArticleGenerationTime: Date.now(),
  eventGenerationPeriodMinutes: 30,
  lastEventGenerationTime: Date.now(),
  editionGenerationPeriodMinutes: 180,
  lastEditionGenerationTime: Date.now()
};

describe("POST /api/chat/send - multi-turn conversation", () => {
  let chatSessions: Map<string, unknown[]>;
  let lastStreamTextOptions: any;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = "test-key";
    chatSessions = new Map();
    lastStreamTextOptions = null;

    // Mock RedisDataStorageService methods to avoid actual Redis
    const { RedisDataStorageService } = await import(
      "../../../services/redis-data-storage.service"
    );
    mock.method(RedisDataStorageService.prototype, "connect", async () => {});
    mock.method(
      RedisDataStorageService.prototype,
      "disconnect",
      async () => {}
    );
    mock.method(
      RedisDataStorageService.prototype,
      "getEditor",
      async () => mockEditor
    );
    mock.method(
      RedisDataStorageService.prototype,
      "getDailyEditions",
      async () => [mockEdition]
    );
    mock.method(
      RedisDataStorageService.prototype,
      "getChatSession",
      async (sessionId: string) => chatSessions.get(sessionId) ?? null
    );
    mock.method(
      RedisDataStorageService.prototype,
      "saveChatSession",
      async (sessionId: string, messages: unknown[]) => {
        chatSessions.set(sessionId, messages);
      }
    );

    // Mock streamText to avoid calling OpenAI
    mock.module("ai", {
      namedExports: {
        streamText: (options: any) => {
          lastStreamTextOptions = options;
          return mockStreamResult("Mocked assistant response");
        }
      }
    });
  });

  afterEach(() => {
    mock.reset();
    delete process.env.OPENAI_API_KEY;
  });

  it("1st message: returns 200 with streamed content and persists session", async () => {
    const { POST } = await import("./route");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello",
        sessionId: "session-1"
      })
    });

    const response = await POST(req);
    assert.equal(response.status, 200);

    const text = await readStream(response.body!);
    assert.equal(text, "Mocked assistant response");

    // Verify session was persisted
    const stored = chatSessions.get("session-1") as any[];
    assert.ok(stored);
    assert.equal(stored.length, 2);
    assert.equal(stored[0].role, "user");
    assert.equal(stored[1].role, "assistant");
    assert.equal(stored[1].content[0].text, "Mocked assistant response");
  });

  it("2nd message: returns 200 with streamed content (not empty)", async () => {
    const { POST } = await import("./route");
    const { NextRequest } = await import("next/server");

    // Pre-populate session with first exchange
    chatSessions.set("session-2", [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi! How can I help?" }]
      }
    ]);

    const req = new NextRequest("http://localhost/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Tell me more",
        sessionId: "session-2"
      })
    });

    const response = await POST(req);
    assert.equal(response.status, 200);

    const text = await readStream(response.body!);
    assert.ok(text.length > 0, "Second response should not be empty");
    assert.equal(text, "Mocked assistant response");

    // Verify streamText received previous context
    assert.ok(lastStreamTextOptions);
    assert.equal(lastStreamTextOptions.messages.length, 3);
    assert.equal(lastStreamTextOptions.messages[0].role, "user");
    assert.equal(lastStreamTextOptions.messages[0].content, "Hello");
    assert.equal(lastStreamTextOptions.messages[1].role, "assistant");
    assert.equal(
      lastStreamTextOptions.messages[1].content,
      "Hi! How can I help?"
    );
    assert.equal(lastStreamTextOptions.messages[2].role, "user");
    assert.equal(lastStreamTextOptions.messages[2].content, "Tell me more");

    // Verify session was updated with new exchange
    const stored = chatSessions.get("session-2") as any[];
    assert.equal(stored.length, 4);
    assert.equal(stored[2].role, "user");
    assert.equal((stored[2].content as any[])[0].text, "Tell me more");
    assert.equal(stored[3].role, "assistant");
    assert.equal(
      (stored[3].content as any[])[0].text,
      "Mocked assistant response"
    );
  });

  it("3rd message: works correctly within limit", async () => {
    const { POST } = await import("./route");
    const { NextRequest } = await import("next/server");

    // Pre-populate with 2 exchanges (2 user messages, allowed)
    chatSessions.set("session-3", [
      { role: "user", content: [{ type: "text", text: "U1" }] },
      { role: "assistant", content: [{ type: "text", text: "A1" }] },
      { role: "user", content: [{ type: "text", text: "U2" }] },
      { role: "assistant", content: [{ type: "text", text: "A2" }] }
    ]);

    const req = new NextRequest("http://localhost/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "U3",
        sessionId: "session-3"
      })
    });

    const response = await POST(req);
    assert.equal(response.status, 200);

    const text = await readStream(response.body!);
    assert.ok(text.length > 0, "Third response should not be empty");
    assert.equal(text, "Mocked assistant response");

    // 3 user messages + 3 assistant messages = 6 total stored
    const stored = chatSessions.get("session-3") as any[];
    assert.equal(stored.length, 6);
  });

  it("4th message: returns 403 conversation ended", async () => {
    const { POST } = await import("./route");
    const { NextRequest } = await import("next/server");

    // Pre-populate with 3 exchanges (max limit)
    chatSessions.set("session-4", [
      { role: "user", content: [{ type: "text", text: "U1" }] },
      { role: "assistant", content: [{ type: "text", text: "A1" }] },
      { role: "user", content: [{ type: "text", text: "U2" }] },
      { role: "assistant", content: [{ type: "text", text: "A2" }] },
      { role: "user", content: [{ type: "text", text: "U3" }] },
      { role: "assistant", content: [{ type: "text", text: "A3" }] }
    ]);

    const req = new NextRequest("http://localhost/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "U4",
        sessionId: "session-4"
      })
    });

    const response = await POST(req);
    assert.equal(response.status, 403);

    const body = await response.json();
    assert.equal(body.error, "conversation_ended");
  });
});
