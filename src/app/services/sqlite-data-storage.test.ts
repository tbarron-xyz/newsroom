import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDataStorageService } from "./sqlite-data-storage.service";
import type {
  Article,
  Editor,
  Event,
  Reporter,
  User,
  NewspaperEdition,
  DailyEdition,
  AdEntry
} from "../schemas/types";

function makeEditor(overrides: Partial<Editor> = {}): Editor {
  const now = Date.now();
  return {
    bio: "Test editor",
    prompt: "You are a test editor",
    modelName: "gpt-4",
    articleModelName: "gpt-4",
    eventModelName: "gpt-4",
    storySelectionModelName: "gpt-4",
    editionSelectionModelName: "gpt-4",
    messageSliceCount: 10,
    inputTokenCost: 2.5,
    outputTokenCost: 10,
    baseUrl: "https://api.openai.com/v1",
    articleGenerationPeriodMinutes: 15,
    lastArticleGenerationTime: now,
    eventGenerationPeriodMinutes: 30,
    lastEventGenerationTime: now,
    editionGenerationPeriodMinutes: 180,
    lastEditionGenerationTime: now,
    ...overrides
  };
}

function makeReporter(overrides: Partial<Reporter> = {}): Reporter {
  return {
    id: "reporter_test_1",
    beats: ["politics", "tech"],
    prompt: "You are a test reporter",
    enabled: true,
    ...overrides
  };
}

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "article_test_1",
    reporterId: "reporter_test_1",
    headline: "Test Article",
    body: "This is a test article body.",
    generationTime: 1000,
    prompt: "Write an article about X",
    messageIds: [1, 2, 3],
    messageTexts: ["msg1", "msg2", "msg3"],
    messageDids: ["did:plc:a", "did:plc:b"],
    messageRkeys: ["rkey1", "rkey2"],
    modelName: "gpt-4",
    ...overrides
  };
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event_test_1",
    reporterId: "reporter_test_1",
    title: "Test Event",
    createdTime: 1000,
    updatedTime: 2000,
    facts: ["fact one", "fact two"],
    where: "Washington DC",
    when: "2024-01-15",
    messageIds: [1, 2],
    messageTexts: ["source msg 1", "source msg 2"],
    modelName: "gpt-4",
    ...overrides
  };
}

function makeUserInput(
  overrides: Partial<Omit<User, "id" | "createdAt" | "lastLoginAt">> = {}
): Omit<User, "id" | "createdAt" | "lastLoginAt"> {
  return {
    email: "test@example.com",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
    role: "editor",
    hasReader: true,
    hasReporter: false,
    hasEditor: true,
    ...overrides
  };
}

function makeNewspaperEdition(
  overrides: Partial<NewspaperEdition> = {}
): NewspaperEdition {
  return {
    id: "edition_test_1",
    stories: ["article_1", "article_2"],
    generationTime: 3000,
    prompt: "Curate an edition",
    modelName: "gpt-4",
    ...overrides
  };
}

function makeDailyEdition(
  overrides: Partial<DailyEdition> = {}
): DailyEdition {
  return {
    id: "daily_test_1",
    editions: ["edition_1", "edition_2"],
    generationTime: 5000,
    frontPageHeadline: "Daily News",
    frontPageArticle: "Top story of the day.",
    newspaperName: "Test Times",
    topics: [
      {
        name: "Politics",
        headline: "Political Headline",
        newsStoryFirstParagraph: "Para one.",
        newsStorySecondParagraph: "Para two.",
        oneLineSummary: "Political summary."
      }
    ],
    prompt: "Compile a daily edition",
    modelName: "gpt-4",
    ...overrides
  };
}

function makeAd(overrides: Partial<AdEntry> = {}): AdEntry {
  return {
    id: "ad_test_1",
    userId: "user_test_1",
    name: "Test Ad",
    bidPrice: 1.5,
    promptContent: "Buy our product!",
    ...overrides
  };
}

describe("SQLiteDataStorageService", () => {
  let storage: SQLiteDataStorageService;

  beforeEach(async () => {
    storage = new SQLiteDataStorageService();
    await storage.connect();
    await storage.clearAllData();
  });

  afterEach(async () => {
    await storage.clearAllData();
    await storage.disconnect();
  });

  describe("connection lifecycle", () => {
    it("connects and disconnects without error", async () => {
      const s = new SQLiteDataStorageService();
      await s.connect();
      await s.disconnect();
    });
  });

  describe("Editor", () => {
    it("saves and retrieves editor with all fields", async () => {
      const editor = makeEditor();
      await storage.saveEditor(editor);
      const retrieved = await storage.getEditor();
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.bio, editor.bio);
      assert.equal(retrieved!.prompt, editor.prompt);
      assert.equal(retrieved!.modelName, editor.modelName);
      assert.equal(retrieved!.articleModelName, editor.articleModelName);
      assert.equal(retrieved!.eventModelName, editor.eventModelName);
      assert.equal(
        retrieved!.storySelectionModelName,
        editor.storySelectionModelName
      );
      assert.equal(
        retrieved!.editionSelectionModelName,
        editor.editionSelectionModelName
      );
      assert.equal(retrieved!.messageSliceCount, editor.messageSliceCount);
      assert.equal(retrieved!.inputTokenCost, editor.inputTokenCost);
      assert.equal(retrieved!.outputTokenCost, editor.outputTokenCost);
      assert.equal(retrieved!.baseUrl, editor.baseUrl);
      assert.equal(
        retrieved!.articleGenerationPeriodMinutes,
        editor.articleGenerationPeriodMinutes
      );
      assert.equal(
        retrieved!.lastArticleGenerationTime,
        editor.lastArticleGenerationTime
      );
    });

    it("returns null when no editor saved", async () => {
      const retrieved = await storage.getEditor();
      assert.equal(retrieved, null);
    });

    it("round-trips optional baseUrl as undefined", async () => {
      const editor = makeEditor({ baseUrl: undefined });
      await storage.saveEditor(editor);
      const retrieved = await storage.getEditor();
      assert.equal(retrieved!.baseUrl, undefined);
    });
  });

  describe("Reporter", () => {
    it("saves and retrieves a reporter with all fields", async () => {
      const reporter = makeReporter();
      await storage.saveReporter(reporter);
      const retrieved = await storage.getReporter(reporter.id);
      assert.notEqual(retrieved, null);
      assert.deepEqual(retrieved!.beats, reporter.beats);
      assert.equal(retrieved!.prompt, reporter.prompt);
      assert.equal(retrieved!.enabled, reporter.enabled);
    });

    it("returns null for non-existent reporter", async () => {
      const retrieved = await storage.getReporter("nonexistent");
      assert.equal(retrieved, null);
    });

    it("getAllReporters returns all reporters", async () => {
      const r1 = makeReporter({ id: "r1", beats: ["a"] });
      const r2 = makeReporter({ id: "r2", beats: ["b"], enabled: false });
      await storage.saveReporter(r1);
      await storage.saveReporter(r2);
      const all = await storage.getAllReporters();
      assert.equal(all.length, 2);
    });

    it("handles empty beats array", async () => {
      const reporter = makeReporter({ beats: [] });
      await storage.saveReporter(reporter);
      const retrieved = await storage.getReporter(reporter.id);
      assert.deepEqual(retrieved!.beats, []);
    });

    it("persists disabled state as false", async () => {
      const reporter = makeReporter({ enabled: false });
      await storage.saveReporter(reporter);
      const retrieved = await storage.getReporter(reporter.id);
      assert.equal(retrieved!.enabled, false);
    });
  });

  describe("Article", () => {
    it("saves and retrieves an article with all fields", async () => {
      const article = makeArticle();
      await storage.saveArticle(article);
      const retrieved = await storage.getArticle(article.id);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.id, article.id);
      assert.equal(retrieved!.reporterId, article.reporterId);
      assert.equal(retrieved!.headline, article.headline);
      assert.equal(retrieved!.body, article.body);
      assert.equal(retrieved!.generationTime, article.generationTime);
      assert.equal(retrieved!.prompt, article.prompt);
      assert.deepEqual(retrieved!.messageIds, article.messageIds);
      assert.deepEqual(retrieved!.messageTexts, article.messageTexts);
      assert.deepEqual(retrieved!.messageDids, article.messageDids);
      assert.deepEqual(retrieved!.messageRkeys, article.messageRkeys);
      assert.equal(retrieved!.modelName, article.modelName);
    });

    it("handles optional token counts as undefined when omitted", async () => {
      const article = makeArticle({
        inputTokenCount: undefined,
        outputTokenCount: undefined
      });
      await storage.saveArticle(article);
      const retrieved = await storage.getArticle(article.id);
      assert.equal(retrieved!.inputTokenCount, undefined);
      assert.equal(retrieved!.outputTokenCount, undefined);
    });

    it("returns null for non-existent article", async () => {
      const retrieved = await storage.getArticle("nonexistent");
      assert.equal(retrieved, null);
    });

    it("getLatestArticles orders by generationTime DESC and respects limit", async () => {
      const a1 = makeArticle({ id: "a1", generationTime: 100 });
      const a2 = makeArticle({ id: "a2", generationTime: 200 });
      const a3 = makeArticle({ id: "a3", generationTime: 300 });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      await storage.saveArticle(a3);
      const all = await storage.getLatestArticles(2);
      assert.equal(all.length, 2);
      assert.equal(all[0].id, "a3");
      assert.equal(all[1].id, "a2");
    });

    it("getArticlesByReporter filters by reporterId", async () => {
      const a1 = makeArticle({ id: "a1", reporterId: "rep_a" });
      const a2 = makeArticle({ id: "a2", reporterId: "rep_b" });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      const results = await storage.getArticlesByReporter("rep_a");
      assert.equal(results.length, 1);
      assert.equal(results[0].id, "a1");
    });

    it("getArticlesInTimeRange returns correct subset", async () => {
      const a1 = makeArticle({ id: "a1", generationTime: 100, reporterId: "rep" });
      const a2 = makeArticle({ id: "a2", generationTime: 200, reporterId: "rep" });
      const a3 = makeArticle({ id: "a3", generationTime: 300, reporterId: "rep" });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      await storage.saveArticle(a3);
      const results = await storage.getArticlesInTimeRange("rep", 150, 350);
      assert.equal(results.length, 2);
      assert.equal(results[0].id, "a3");
      assert.equal(results[1].id, "a2");
    });

    it("getArticlesInTimeRangeGlobal returns articles across all reporters", async () => {
      const a1 = makeArticle({ id: "a1", generationTime: 100, reporterId: "r1" });
      const a2 = makeArticle({ id: "a2", generationTime: 200, reporterId: "r2" });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      const results = await storage.getArticlesInTimeRangeGlobal(50, 250);
      assert.equal(results.length, 2);
    });
  });

  describe("Event", () => {
    it("saves and retrieves an event with all fields", async () => {
      const event = makeEvent();
      await storage.saveEvent(event);
      const retrieved = await storage.getEvent(event.id);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.id, event.id);
      assert.equal(retrieved!.title, event.title);
      assert.equal(retrieved!.createdTime, event.createdTime);
      assert.equal(retrieved!.updatedTime, event.updatedTime);
      assert.deepEqual(retrieved!.facts, event.facts);
      assert.equal(retrieved!.where, event.where);
      assert.equal(retrieved!.when, event.when);
      assert.equal(retrieved!.modelName, event.modelName);
    });

    it("handles optional where/when as undefined", async () => {
      const event = makeEvent({ where: undefined, when: undefined });
      await storage.saveEvent(event);
      const retrieved = await storage.getEvent(event.id);
      assert.equal(retrieved!.where, undefined);
      assert.equal(retrieved!.when, undefined);
    });

    it("getEventsByReporter orders by updatedTime DESC", async () => {
      const e1 = makeEvent({
        id: "e1",
        reporterId: "rep",
        updatedTime: 100
      });
      const e2 = makeEvent({
        id: "e2",
        reporterId: "rep",
        updatedTime: 300
      });
      await storage.saveEvent(e1);
      await storage.saveEvent(e2);
      const results = await storage.getEventsByReporter("rep");
      assert.equal(results.length, 2);
      assert.equal(results[0].id, "e2");
    });

    it("getLatestUpdatedEvents returns most recently updated", async () => {
      const e1 = makeEvent({ id: "e1", updatedTime: 100 });
      const e2 = makeEvent({ id: "e2", updatedTime: 200 });
      await storage.saveEvent(e1);
      await storage.saveEvent(e2);
      const results = await storage.getLatestUpdatedEvents();
      assert.equal(results.length, 2);
      assert.equal(results[0].id, "e2");
    });
  });

  describe("NewspaperEdition", () => {
    it("saves and retrieves a newspaper edition", async () => {
      const edition = makeNewspaperEdition();
      await storage.saveNewspaperEdition(edition);
      const retrieved = await storage.getNewspaperEdition(edition.id);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.id, edition.id);
      assert.deepEqual(retrieved!.stories, edition.stories);
      assert.equal(retrieved!.generationTime, edition.generationTime);
      assert.equal(retrieved!.prompt, edition.prompt);
    });

    it("getNewspaperEditions orders by generationTime DESC", async () => {
      const e1 = makeNewspaperEdition({
        id: "e1",
        generationTime: 100
      });
      const e2 = makeNewspaperEdition({
        id: "e2",
        generationTime: 200
      });
      await storage.saveNewspaperEdition(e1);
      await storage.saveNewspaperEdition(e2);
      const results = await storage.getNewspaperEditions();
      assert.equal(results.length, 2);
      assert.equal(results[0].id, "e2");
    });
  });

  describe("DailyEdition", () => {
    it("saves and retrieves a daily edition", async () => {
      const de = makeDailyEdition();
      await storage.saveDailyEdition(de);
      const retrieved = await storage.getDailyEdition(de.id);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.id, de.id);
      assert.deepEqual(retrieved!.editions, de.editions);
      assert.equal(retrieved!.frontPageHeadline, de.frontPageHeadline);
      assert.equal(retrieved!.frontPageArticle, de.frontPageArticle);
      assert.equal(retrieved!.newspaperName, de.newspaperName);
      assert.equal(retrieved!.topics.length, de.topics.length);
      assert.equal(retrieved!.topics[0].name, de.topics[0].name);
      assert.equal(retrieved!.topics[0].headline, de.topics[0].headline);
      assert.equal(retrieved!.prompt, de.prompt);
    });

    it("getDailyEditions orders by generationTime DESC", async () => {
      const d1 = makeDailyEdition({ id: "d1", generationTime: 100 });
      const d2 = makeDailyEdition({ id: "d2", generationTime: 200 });
      await storage.saveDailyEdition(d1);
      await storage.saveDailyEdition(d2);
      const results = await storage.getDailyEditions();
      assert.equal(results.length, 2);
      assert.equal(results[0].id, "d2");
    });

    it("handles empty topics array", async () => {
      const de = makeDailyEdition({ topics: [] });
      await storage.saveDailyEdition(de);
      const retrieved = await storage.getDailyEdition(de.id);
      assert.deepEqual(retrieved!.topics, []);
    });
  });

  describe("User", () => {
    it("createUser returns a user with id and createdAt", async () => {
      const input = makeUserInput();
      const user = await storage.createUser(input);
      assert.ok(user.id.startsWith("user_"));
      assert.equal(typeof user.createdAt, "number");
      assert.equal(user.email, input.email);
      assert.equal(user.role, input.role);
      assert.equal(user.hasReader, input.hasReader);
    });

    it("getUserById retrieves the created user", async () => {
      const input = makeUserInput();
      const created = await storage.createUser(input);
      const retrieved = await storage.getUserById(created.id);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.email, input.email);
      assert.equal(retrieved!.role, input.role);
    });

    it("getUserByEmail retrieves user by email", async () => {
      const input = makeUserInput();
      const created = await storage.createUser(input);
      const retrieved = await storage.getUserByEmail(input.email);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.id, created.id);
    });

    it("getUserByEmail returns null for unknown email", async () => {
      const retrieved = await storage.getUserByEmail("unknown@test.com");
      assert.equal(retrieved, null);
    });

    it("getAllUsers returns all users", async () => {
      await storage.createUser(makeUserInput({ email: "a@test.com" }));
      await storage.createUser(makeUserInput({ email: "b@test.com" }));
      const all = await storage.getAllUsers();
      assert.equal(all.length, 2);
    });

    it("updateUserLastLogin sets lastLoginAt", async () => {
      const user = await storage.createUser(makeUserInput());
      const before = await storage.getUserById(user.id);
      assert.equal(before!.lastLoginAt, undefined);
      await storage.updateUserLastLogin(user.id);
      const after = await storage.getUserById(user.id);
      assert.equal(typeof after!.lastLoginAt, "number");
    });

    it("deleteUser removes user", async () => {
      const user = await storage.createUser(makeUserInput());
      await storage.deleteUser(user.id);
      const retrieved = await storage.getUserById(user.id);
      assert.equal(retrieved, null);
    });

    it("enforces unique email constraint", async () => {
      await storage.createUser(makeUserInput({ email: "dup@test.com" }));
      await assert.rejects(
        () => storage.createUser(makeUserInput({ email: "dup@test.com" })),
        /UNIQUE constraint failed/
      );
    });
  });

  describe("Ad", () => {
    it("saves and retrieves an ad", async () => {
      const ad = makeAd();
      await storage.saveAd(ad);
      const retrieved = await storage.getAd(ad.id);
      assert.notEqual(retrieved, null);
      assert.equal(retrieved!.name, ad.name);
      assert.equal(retrieved!.bidPrice, ad.bidPrice);
      assert.equal(retrieved!.promptContent, ad.promptContent);
    });

    it("getAllAds returns all ads", async () => {
      const a1 = makeAd({ id: "ad1" });
      const a2 = makeAd({ id: "ad2" });
      await storage.saveAd(a1);
      await storage.saveAd(a2);
      const all = await storage.getAllAds();
      assert.equal(all.length, 2);
    });

    it("getMostRecentAd returns the ad with the most recent timestamp in its ID", async () => {
      const a1 = makeAd({ id: "ad_1000_abc" });
      const a2 = makeAd({ id: "ad_2000_def" });
      await storage.saveAd(a1);
      await storage.saveAd(a2);
      const recent = await storage.getMostRecentAd();
      assert.notEqual(recent, null);
      assert.equal(recent!.id, "ad_2000_def");
    });

    it("updateAd partial update", async () => {
      const ad = makeAd();
      await storage.saveAd(ad);
      await storage.updateAd(ad.id, { name: "Updated Ad", bidPrice: 5.0 });
      const retrieved = await storage.getAd(ad.id);
      assert.equal(retrieved!.name, "Updated Ad");
      assert.equal(retrieved!.bidPrice, 5.0);
    });

    it("deleteAd removes ad", async () => {
      const ad = makeAd();
      await storage.saveAd(ad);
      await storage.deleteAd(ad.id);
      const retrieved = await storage.getAd(ad.id);
      assert.equal(retrieved, null);
    });
  });

  describe("Job status", () => {
    it("setJobRunning and getJobRunning round-trip", async () => {
      await storage.setJobRunning("reporter", true);
      assert.equal(await storage.getJobRunning("reporter"), true);
      await storage.setJobRunning("reporter", false);
      assert.equal(await storage.getJobRunning("reporter"), false);
    });

    it("setJobLastRun and getJobLastRun round-trip", async () => {
      const ts = Date.now();
      await storage.setJobLastRun("reporter", ts);
      assert.equal(await storage.getJobLastRun("reporter"), ts);
    });

    it("setJobLastSuccess and getJobLastSuccess round-trip", async () => {
      const ts = Date.now();
      await storage.setJobLastSuccess("reporter", ts);
      assert.equal(await storage.getJobLastSuccess("reporter"), ts);
    });

    it("getJobRunning returns false for unknown job", async () => {
      assert.equal(await storage.getJobRunning("unknown"), false);
    });
  });

  describe("KPI", () => {
    it("setKpiValue and getKpiValue round-trip", async () => {
      await storage.setKpiValue("Total AI API spend", 42.5);
      assert.equal(await storage.getKpiValue("Total AI API spend"), 42.5);
    });

    it("getKpiValue returns 0 for unknown KPI", async () => {
      assert.equal(await storage.getKpiValue("nonexistent"), 0);
    });

    it("incrementKpiValue adds to existing value", async () => {
      await storage.setKpiValue("Total text input tokens", 100);
      await storage.incrementKpiValue("Total text input tokens", 50);
      assert.equal(await storage.getKpiValue("Total text input tokens"), 150);
    });
  });

  describe("Log", () => {
    it("addLog and getAllLogs round-trip", async () => {
      await storage.addLog("test message");
      const logs = await storage.getAllLogs();
      assert.ok(logs.length >= 1);
      assert.ok(logs.some((m) => m.includes("test message")));
    });
  });

  describe("clearAllData", () => {
    it("wipes all tables", async () => {
      await storage.saveEditor(makeEditor());
      await storage.saveReporter(makeReporter());
      await storage.saveArticle(makeArticle());
      await storage.saveEvent(makeEvent());
      await storage.saveNewspaperEdition(makeNewspaperEdition());
      await storage.saveDailyEdition(makeDailyEdition());
      await storage.createUser(makeUserInput());
      await storage.saveAd(makeAd());

      await storage.clearAllData();

      assert.equal(await storage.getEditor(), null);
      assert.deepEqual(await storage.getAllReporters(), []);
      assert.deepEqual(await storage.getLatestArticles(), []);
      assert.deepEqual(await storage.getLatestUpdatedEvents(), []);
      assert.deepEqual(await storage.getNewspaperEditions(), []);
      assert.deepEqual(await storage.getDailyEditions(), []);
      assert.deepEqual(await storage.getAllUsers(), []);
      assert.deepEqual(await storage.getAllAds(), []);
    });
  });
});
