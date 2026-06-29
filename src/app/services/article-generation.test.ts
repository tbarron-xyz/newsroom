import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDataStorageService } from "./sqlite-data-storage.service";
import { ServiceContainer } from "./service-container";

const reporterId = "reporter_test_1";

const mockMessages = [
  {
    did: "did:plc:mocked",
    rkey: "aaaaaa",
    text: "AI is transforming the news industry rapidly",
    time: Date.now()
  },
  {
    did: "did:plc:mocked2",
    rkey: "bbbbbb",
    text: "New study shows AI-generated articles are convincing",
    time: Date.now()
  }
];

const mockHeadline = "AI Innovations Reshape News Industry";
const mockLead = "Artificial intelligence is fundamentally changing how news organizations operate.";
const mockBody = "From automated fact-checking to personalized content delivery, AI tools are becoming essential in modern newsrooms. Publishers report significant efficiency gains while maintaining editorial quality.";

const mockCompletionContent = JSON.stringify({
  id: "article_mock_001",
  reporterId,
  beat: "tech",
  headline: mockHeadline,
  leadParagraph: mockLead,
  body: mockBody,
  keyQuotes: ["AI is not replacing journalists, it is augmenting them"],
  sources: ["Newsroom AI Report"],
  messageIds: [1],
  potentialMessageIds: [2],
  reporterNotes: {
    researchQuality: "high",
    sourceDiversity: "medium",
    factualAccuracy: "high"
  },
  socialMediaSummary: "Social media discussions highlight AI's growing role in journalism"
});

const mockChatCompletion = {
  id: "chatcmpl-mock-article-001",
  object: "chat.completion",
  created: Math.floor(Date.now() / 1000),
  model: "gpt-4",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: mockCompletionContent
      },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: 500,
    completion_tokens: 120,
    total_tokens: 620
  }
};

describe("Article generation pipeline", () => {
  let storage: SQLiteDataStorageService;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = "test-key-for-mocking";
    process.env.DATA_STORAGE_BACKEND = "sqlite";

    await ServiceContainer.getInstance().disconnect();

    const { AIClient } = await import("./ai-client");
    mock.method(AIClient.prototype, "createChatCompletion", async () => ({
      response: mockChatCompletion as any,
      modelUsed: "gpt-4"
    }));

    const { AIService: AIServiceClass } = await import("./ai.service");
    mock.method(
      AIServiceClass.prototype,
      "fetchSocialMediaMessages",
      async () => mockMessages
    );

    storage = new SQLiteDataStorageService();
    await storage.connect();
    await storage.clearAllData();

    const { makeEditor, makeReporter } = await import("./test-data-factories");
    await storage.saveEditor(makeEditor());
    await storage.saveReporter(makeReporter({ id: reporterId }));
  });

  afterEach(async () => {
    await storage.clearAllData();
    await storage.disconnect();
    await ServiceContainer.getInstance().disconnect();
    mock.reset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.DATA_STORAGE_BACKEND;
  });

  it("generates an article and persists it to storage", async () => {
    const { AIService } = await import("./ai.service");
    const { ReporterService } = await import("./reporter.service");

    const aiService = new AIService(storage);
    const reporterService = new ReporterService(storage, aiService);

    const articles = await reporterService.generateArticlesForReporter(reporterId);

    assert.equal(articles.length, 1);
    assert.equal(articles[0].headline, mockHeadline);
    assert.equal(articles[0].reporterId, reporterId);
    assert.ok(articles[0].body.startsWith(mockLead));
    assert.equal(articles[0].modelName, "gpt-4");
    assert.equal(articles[0].messageTexts.length, 2);
    assert.equal(articles[0].messageTexts[0], mockMessages[0].text);
    assert.equal(articles[0].messageDids[0], mockMessages[0].did);
    assert.equal(articles[0].messageRkeys[0], mockMessages[0].rkey);
    assert.equal(articles[0].messageTexts[1], mockMessages[1].text);
    assert.equal(articles[0].messageDids[1], mockMessages[1].did);
    assert.equal(articles[0].messageRkeys[1], mockMessages[1].rkey);

    const saved = await storage.getArticlesByReporter(reporterId);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].id, articles[0].id);
    assert.equal(saved[0].headline, mockHeadline);
    assert.equal(saved[0].body, articles[0].body);
    assert.equal(saved[0].reporterId, reporterId);
    assert.deepEqual(saved[0].messageIds, [1]);
  });

  it("serves persisted articles through the API endpoint", async () => {
    const { AIService } = await import("./ai.service");
    const { ReporterService } = await import("./reporter.service");
    const aiService = new AIService(storage);
    const reporterService = new ReporterService(storage, aiService);

    await reporterService.generateArticlesForReporter(reporterId);

    const { GET } = await import("../api/articles/route");
    const { NextRequest } = await import("next/server");

    const request = new NextRequest(
      new URL(`http://localhost/api/articles?reporterId=${reporterId}`)
    );
    const response = await GET(request);

    assert.equal(response.status, 200);

    const data = await response.json();
    assert.equal(Array.isArray(data), true);
    assert.equal(data.length, 1);
    assert.equal(data[0].headline, mockHeadline);
    assert.equal(data[0].reporterId, reporterId);
    assert.ok(typeof data[0].id === "string");
    assert.ok(typeof data[0].body === "string");
    assert.ok(Array.isArray(data[0].messageTexts));
  });
});
