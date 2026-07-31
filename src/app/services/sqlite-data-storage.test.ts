import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { SQLiteDataStorageService } from "./sqlite-data-storage.service";
import {
  makeEditor,
  makeReporter,
  makeArticle,
  makeEvent,
  makeUserInput,
  makeNewspaperEdition,
  makeDailyEdition,
  makeTicker,
  makeOpinionArticle
} from "./test-data-factories";

const MEMORY_DB = ":memory:";

describe("SQLiteDataStorageService", () => {
  let storage: SQLiteDataStorageService;

  beforeEach(async () => {
    storage = new SQLiteDataStorageService(MEMORY_DB);
    await storage.connect();
    await storage.clearAllData();
  });

  afterEach(async () => {
    await storage.clearAllData();
    await storage.disconnect();
  });

  describe("connection lifecycle", () => {
    it("connects and disconnects without error", async () => {
      const s = new SQLiteDataStorageService(MEMORY_DB);
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

    it("getLatestPublishedArticles excludes drafts and respects limit", async () => {
      const a1 = makeArticle({ id: "a1", generationTime: 100 });
      const a2 = makeArticle({
        id: "a2",
        generationTime: 200,
        published: false
      });
      const a3 = makeArticle({ id: "a3", generationTime: 300 });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      await storage.saveArticle(a3);
      const all = await storage.getLatestPublishedArticles(2);
      assert.deepEqual(
        all.map((a) => a.id),
        ["a3", "a1"]
      );
    });

    it("getDraftArticles returns only drafts and respects limit", async () => {
      const a1 = makeArticle({ id: "a1", generationTime: 100 });
      const a2 = makeArticle({
        id: "a2",
        generationTime: 200,
        published: false
      });
      const a3 = makeArticle({ id: "a3", generationTime: 300 });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      await storage.saveArticle(a3);
      const all = await storage.getDraftArticles(10);
      assert.deepEqual(
        all.map((a) => a.id),
        ["a2"]
      );
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
      const a1 = makeArticle({
        id: "a1",
        generationTime: 100,
        reporterId: "rep"
      });
      const a2 = makeArticle({
        id: "a2",
        generationTime: 200,
        reporterId: "rep"
      });
      const a3 = makeArticle({
        id: "a3",
        generationTime: 300,
        reporterId: "rep"
      });
      await storage.saveArticle(a1);
      await storage.saveArticle(a2);
      await storage.saveArticle(a3);
      const results = await storage.getArticlesInTimeRange("rep", 150, 350);
      assert.equal(results.length, 2);
      assert.equal(results[0].id, "a3");
      assert.equal(results[1].id, "a2");
    });

    it("getArticlesInTimeRangeGlobal returns articles across all reporters", async () => {
      const a1 = makeArticle({
        id: "a1",
        generationTime: 100,
        reporterId: "r1"
      });
      const a2 = makeArticle({
        id: "a2",
        generationTime: 200,
        reporterId: "r2"
      });
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

    it("preserves all job_status fields when setting individually", async () => {
      const runTs = Date.now();
      const successTs = runTs + 1000;
      await storage.setJobRunning("reporter", true);
      await storage.setJobLastRun("reporter", runTs);
      await storage.setJobLastSuccess("reporter", successTs);
      assert.equal(await storage.getJobRunning("reporter"), true);
      assert.equal(await storage.getJobLastRun("reporter"), runTs);
      assert.equal(await storage.getJobLastSuccess("reporter"), successTs);
      // Change running to false — lastRun and lastSuccess must survive
      await storage.setJobRunning("reporter", false);
      assert.equal(await storage.getJobRunning("reporter"), false);
      assert.equal(await storage.getJobLastRun("reporter"), runTs);
      assert.equal(await storage.getJobLastSuccess("reporter"), successTs);
      // Update lastRun — running and lastSuccess must survive
      const newRunTs = runTs + 500;
      await storage.setJobLastRun("reporter", newRunTs);
      assert.equal(await storage.getJobRunning("reporter"), false);
      assert.equal(await storage.getJobLastRun("reporter"), newRunTs);
      assert.equal(await storage.getJobLastSuccess("reporter"), successTs);
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
      await storage.saveTicker(makeTicker());
      await storage.saveOpinionArticle(makeOpinionArticle());

      await storage.clearAllData();

      assert.equal(await storage.getEditor(), null);
      assert.deepEqual(await storage.getAllReporters(), []);
      assert.deepEqual(await storage.getLatestArticles(), []);
      assert.deepEqual(await storage.getLatestUpdatedEvents(), []);
      assert.deepEqual(await storage.getNewspaperEditions(), []);
      assert.deepEqual(await storage.getDailyEditions(), []);
      assert.deepEqual(await storage.getAllUsers(), []);
      assert.equal(await storage.getLatestTicker(), null);
      assert.deepEqual(await storage.getLatestOpinionArticles(), []);
    });
  });
});
