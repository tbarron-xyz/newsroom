import { Job } from "bullmq";
import { ServiceContainer } from "../services/service-container";
import { IDataStorageService } from "../services/data-storage.interface";
import { ResearchEntry, ResearchLLMCall } from "../schemas/types";

async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

async function saveProgress(
  dataStorage: IDataStorageService,
  entry: ResearchEntry,
  llmCalls: ResearchLLMCall[],
  currentPhase: string
): Promise<void> {
  await dataStorage.saveResearchEntry({
    ...entry,
    llmCalls,
    currentPhase
  });
}

export async function processResearchJob(
  job: Job,
  container: ServiceContainer
): Promise<void> {
  const { researchId } = job.data;
  console.log(`Processing research job ${researchId}`);

  const dataStorage = await container.getDataStorageService();
  const aiService = await container.getAIService();
  const wikipediaService = await container.getWikipediaService();

  const entry = await dataStorage.getResearchEntry(researchId);
  if (!entry) throw new Error(`Research entry not found: ${researchId}`);

  const { topic, goal } = entry;
  const llmCalls: ResearchLLMCall[] = [];

  try {
    // Phase 1: Suggest next articles
    console.log(`Fetching wikitext for topic: ${topic}`);
    const topicWikitext = await wikipediaService.fetchWikitext(topic);

    console.log(`Getting article suggestions for: ${topic}`);
    await saveProgress(dataStorage, entry, llmCalls, "suggesting");

    const suggestionResult = await aiService.suggestNextArticles(topic, goal);

    const {
      recommendations,
      modelName,
      inputTokenCount: suggestTokens,
      outputTokenCount: suggestOutputTokens
    } = suggestionResult;

    llmCalls.push({
      step: "suggest-next-articles",
      modelName: modelName || "",
      inputTokens: suggestTokens || 0,
      outputTokens: suggestOutputTokens || 0
    });

    let totalInputTokens = suggestTokens || 0;
    let totalOutputTokens = suggestOutputTokens || 0;

    await saveProgress(dataStorage, entry, llmCalls, `summarizing`);

    const summaries: Array<{
      articleTitle: string;
      summaryParagraphs: string[];
    }> = [];
    const failedArticles: string[] = [];

    const results = await processWithConcurrency(
      recommendations,
      async (rec) => {
        console.log(`Fetching wikitext for: ${rec.title}`);
        const wikitext = await wikipediaService.fetchWikitext(rec.title);

        console.log(`Summarizing: ${rec.title}`);
        const summaryResult = await aiService.summarizeArticleForGoal(
          rec.title,
          wikitext,
          goal
        );

        const call: ResearchLLMCall = {
          step: "summarize-article",
          modelName: summaryResult.modelName || "",
          inputTokens: summaryResult.inputTokenCount || 0,
          outputTokens: summaryResult.outputTokenCount || 0,
          articleTitle: rec.title
        };
        llmCalls.push(call);

        // Save progress after each summary
        const completedCount = llmCalls.filter(
          (c) => c.step === "summarize-article"
        ).length;
        await saveProgress(
          dataStorage,
          entry,
          llmCalls,
          `summarizing (${completedCount}/${recommendations.length})`
        );

        return {
          articleTitle: rec.title,
          summaryParagraphs: summaryResult.summaryParagraphs,
          inputTokenCount: summaryResult.inputTokenCount || 0,
          outputTokenCount: summaryResult.outputTokenCount || 0
        };
      },
      3
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        const r = result.value;
        summaries.push({
          articleTitle: r.articleTitle,
          summaryParagraphs: r.summaryParagraphs
        });
        totalInputTokens += r.inputTokenCount;
        totalOutputTokens += r.outputTokenCount;
      } else {
        const title = recommendations[i].title;
        console.error(`Failed to process article "${title}":`, result.reason);
        failedArticles.push(title);
      }
    }

    const summariesText = summaries
      .map(
        (s) =>
          `Article: ${s.articleTitle}\n${s.summaryParagraphs.map((p, i) => `Paragraph ${i + 1}: ${p}`).join("\n")}`
      )
      .join("\n\n---\n\n");

    let failedNote = "";
    if (failedArticles.length > 0) {
      failedNote = `\n\n[Note: The following articles could not be processed: ${failedArticles.join(", ")}]`;
    }

    // Phase 3: Synthesize findings
    console.log(`Synthesizing findings for: ${topic}`);
    await saveProgress(dataStorage, entry, llmCalls, "synthesizing");

    const findingsResult = await aiService.synthesizeFindings(
      summariesText + failedNote,
      goal
    );

    llmCalls.push({
      step: "synthesize-findings",
      modelName: findingsResult.modelName || "",
      inputTokens: findingsResult.inputTokenCount || 0,
      outputTokens: findingsResult.outputTokenCount || 0
    });

    totalInputTokens += findingsResult.inputTokenCount || 0;
    totalOutputTokens += findingsResult.outputTokenCount || 0;

    await dataStorage.saveResearchEntry({
      ...entry,
      suggestions: recommendations.map((r) => ({
        ...r,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`
      })),
      summaries,
      findingsDocument: findingsResult.findingsDocument,
      status: "completed",
      modelName: modelName || findingsResult.modelName,
      inputTokenCount: totalInputTokens,
      outputTokenCount: totalOutputTokens,
      llmCalls,
      currentPhase: "completed"
    });

    console.log(`Research job ${researchId} completed successfully`);
  } catch (error) {
    console.error(`Research job ${researchId} failed:`, error);
    await dataStorage.saveResearchEntry({
      ...entry,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      llmCalls,
      currentPhase: "failed"
    });
    throw error;
  }
}
