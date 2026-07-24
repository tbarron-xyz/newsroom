import { Reporter, Article, Event, Editor } from "../schemas/types";
import { IDataStorageService } from "./data-storage.interface";
import { AIService } from "./ai.service";

export class ReporterService {
  constructor(
    private dataStorageService: IDataStorageService,
    private aiService: AIService
  ) {}

  async generateArticlesForReporter(
    reporterId: string,
    modelNameOverride?: string,
    published?: boolean
  ): Promise<Article[]> {
    console.log(`Reporter ${reporterId}: Starting article generation...`);

    // Get reporter information
    const reporter = await this.dataStorageService.getReporter(reporterId);
    if (!reporter) {
      throw new Error(`Reporter ${reporterId} not found`);
    }

    // Get editor configuration for model settings
    const editor = await this.dataStorageService.getEditor();
    if (!editor) {
      throw new Error("Editor configuration not found");
    }

    const usedModelName = modelNameOverride?.trim() || editor.articleModelName;

    const numArticles = 1;
    const articles: Article[] = [];

    for (let i = 0; i < numArticles; i++) {
      try {
        const structuredArticle =
          await this.aiService.generateStructuredArticle(
            reporter,
            usedModelName
          );

        // Check if messageIds is empty - if so, skip generating and saving this article
        if (
          !structuredArticle.response.messageIds ||
          structuredArticle.response.messageIds.length === 0
        ) {
          console.log(
            `Skipping article generation for reporter ${reporterId} - no messageIds returned`
          );
          continue;
        }

        // Extract message texts and source IDs for the used message IDs
        const messageTexts: string[] = [];
        const messageDids: string[] = [];
        const messageRkeys: string[] = [];
        if (
          structuredArticle.response.messageIds &&
          structuredArticle.response.messageIds.length > 0
        ) {
          console.log(
            `Article used message IDs: ${structuredArticle.response.messageIds.join(", ")}`
          );
          const ids = [
            ...new Set(structuredArticle.response.messageIds).union(
              new Set(structuredArticle.response.potentialMessageIds)
            )
          ];
          ids.forEach((x) => {
            const msg = structuredArticle.messages[x - 1];
            messageTexts.push(msg.text);
            messageDids.push(msg.did);
            messageRkeys.push(msg.rkey);
          });
        }

        // Convert structured article to simple Article format for storage
        const article: Article = {
          id: structuredArticle.response.id,
          reporterId: structuredArticle.response.reporterId,
          headline: structuredArticle.response.headline,
          body: `${structuredArticle.response.leadParagraph}\n\n${structuredArticle.response.body}`,
          generationTime: structuredArticle.response.generationTime,
          prompt: structuredArticle.prompt,
          messageIds: structuredArticle.response.messageIds || [],
          messageTexts: messageTexts,
          messageDids: messageDids,
          messageRkeys: messageRkeys,
          modelName: structuredArticle.response.modelName,
          published: published !== false
        };
        articles.push(article);
        console.log(`Generated article: "${article.headline}"`);
      } catch (error) {
        console.error(
          `Failed to generate article ${i + 1} for reporter ${reporterId}:`,
          error
        );
      }
    }

    // Save all articles
    for (const article of articles) {
      await this.dataStorageService.saveArticle(article);
    }

    console.log(`Reporter ${reporterId} generated ${articles.length} articles`);
    return articles;
  }

  async generateAllReporterArticles(
    currentTime?: number,
    editor?: Editor | null,
    options?: { published?: boolean; modelName?: string }
  ): Promise<{
    [reporterId: string]: Article[];
  }> {
    console.log("Starting article generation for all reporters...");

    // Get all reporters
    const reporters = await this.dataStorageService.getAllReporters();
    if (reporters.length === 0) {
      throw new Error("No reporters available to generate articles");
    }

    // Filter to only enabled reporters
    const enabledReporters = reporters.filter((reporter) => reporter.enabled);
    console.log(
      `Found ${reporters.length} total reporters, ${enabledReporters.length} enabled`
    );

    if (enabledReporters.length === 0) {
      console.log("No enabled reporters available to generate articles");
      return {};
    }

    if (!editor) {
      editor = await this.dataStorageService.getEditor();
    }

    const usedModelName =
      options?.modelName?.trim() || editor?.articleModelName;

    const results: { [reporterId: string]: Article[] } = {};

    // Generate articles for each enabled reporter
    for (const reporter of enabledReporters) {
      try {
        const articles = await this.generateArticlesForReporter(
          reporter.id,
          usedModelName,
          options?.published
        );
        results[reporter.id] = articles;
      } catch (error) {
        console.error(
          `Failed to generate articles for reporter ${reporter.id}:`,
          error
        );
        results[reporter.id] = [];
      }
    }

    const totalArticles = Object.values(results).reduce(
      (sum, articles) => sum + articles.length,
      0
    );
    console.log(
      `Generated ${totalArticles} articles across ${enabledReporters.length} enabled reporters`
    );

    return results;
  }

  async getReporterArticles(
    reporterId: string,
    limit?: number
  ): Promise<Article[]> {
    return await this.dataStorageService.getArticlesByReporter(
      reporterId,
      limit
    );
  }

  async getAllReporterStats(): Promise<{
    [reporterId: string]: {
      reporter: Reporter;
      articleCount: number;
      latestArticle?: Article;
    };
  }> {
    const reporters = await this.dataStorageService.getAllReporters();
    const stats: {
      [reporterId: string]: {
        reporter: Reporter;
        articleCount: number;
        latestArticle?: Article;
      };
    } = {};

    for (const reporter of reporters) {
      const articles = await this.dataStorageService.getArticlesByReporter(
        reporter.id,
        1
      );
      stats[reporter.id] = {
        reporter,
        articleCount: await this.getArticleCountForReporter(reporter.id),
        latestArticle: articles.length > 0 ? articles[0] : undefined
      };
    }

    return stats;
  }

  private async getArticleCountForReporter(
    reporterId: string
  ): Promise<number> {
    // This is a simplified count - in a real implementation, you might want to cache this
    const articles =
      await this.dataStorageService.getArticlesByReporter(reporterId);
    return articles.length;
  }

  async createReporter(reporterData: Omit<Reporter, "id">): Promise<Reporter> {
    const reporterId = await this.dataStorageService.generateId("reporter");
    const reporter: Reporter = {
      id: reporterId,
      ...reporterData,
      enabled: reporterData.enabled ?? true // Default to true if not specified
    };

    await this.dataStorageService.saveReporter(reporter);
    console.log(
      `Created new reporter: ${reporterId} (${reporter.beats.join(", ")})`
    );

    return reporter;
  }

  async updateReporter(
    reporterId: string,
    updates: Partial<Omit<Reporter, "id">>
  ): Promise<Reporter | null> {
    const existingReporter =
      await this.dataStorageService.getReporter(reporterId);
    if (!existingReporter) {
      return null;
    }

    const updatedReporter: Reporter = {
      ...existingReporter,
      ...updates
    };

    await this.dataStorageService.saveReporter(updatedReporter);
    console.log(`Updated reporter: ${reporterId}`);

    return updatedReporter;
  }

  async deleteReporter(reporterId: string): Promise<boolean> {
    const reporter = await this.dataStorageService.getReporter(reporterId);
    if (!reporter) {
      return false;
    }

    // Note: In a real implementation, you might want to handle cleanup of associated articles
    // For now, we'll just remove the reporter from the set
    // The articles will remain but become orphaned

    const reporters = await this.dataStorageService.getAllReporters();
    const updatedReporters = reporters.filter((r) => r.id !== reporterId);

    // Clear and repopulate the reporters set
    // This is a simplified approach - in production, you'd want atomic operations
    await this.dataStorageService.clearAllData();

    // Recreate all reporters except the deleted one
    for (const r of updatedReporters) {
      await this.dataStorageService.saveReporter(r);
    }

    console.log(`Deleted reporter: ${reporterId}`);
    return true;
  }

  async generateEventsForReporter(reporterId: string): Promise<Event[]> {
    console.log(`Reporter ${reporterId}: Starting event generation...`);

    // Get reporter information
    const reporter = await this.dataStorageService.getReporter(reporterId);
    if (!reporter) {
      throw new Error(`Reporter ${reporterId} not found`);
    }

    // Get editor configuration for model settings
    const editor = await this.dataStorageService.getEditor();
    if (!editor) {
      throw new Error("Editor configuration not found");
    }

    console.log(
      `Reporter ${reporterId}: Generating events for beats: ${reporter.beats.join(", ")}`
    );

    // Get last 5 events for this reporter
    const lastEvents = await this.dataStorageService.getEventsByReporter(
      reporterId,
      5
    );
    console.log(
      `Reporter ${reporterId}: Found ${lastEvents.length} previous events`
    );

    // Generate events using AI service
    const eventGenerationResult = await this.aiService.generateEvents(
      reporter,
      lastEvents,
      editor.eventModelName
    );

    const generatedEvents: Event[] = [];
    const now = Date.now();

    for (const aiEvent of eventGenerationResult.events) {
      try {
        // Extract message texts for the used message IDs
        const messageTexts: string[] = [];
        if (aiEvent.messageIds && aiEvent.messageIds.length > 0) {
          console.log(
            `Event used message IDs: ${aiEvent.messageIds.join(", ")}`
          );
          const ids = [
            ...new Set(aiEvent.messageIds).union(
              new Set(aiEvent.potentialMessageIds || [])
            )
          ];
          ids.forEach((x) => {
            const index = x - 1;
            if (index >= 0 && index < eventGenerationResult.messages.length) {
              const msg = eventGenerationResult.messages[index];
              messageTexts.push(typeof msg === "string" ? msg : msg.text);
            } else {
              console.warn(
                `Invalid message index ${x} (1-based) - out of bounds for ${eventGenerationResult.messages.length} messages`
              );
            }
          });
        }

        // Create new event
        const eventId = await this.dataStorageService.generateId("event");
        const newEvent: Event = {
          id: eventId,
          reporterId,
          title: aiEvent.title,
          createdTime: now,
          updatedTime: now,
          facts: aiEvent.facts,
          where: aiEvent.where || undefined,
          when: aiEvent.when || undefined,
          messageIds: aiEvent.messageIds || [],
          messageTexts: messageTexts,
          modelName: aiEvent.modelName,
          inputTokenCount: aiEvent.inputTokenCount,
          outputTokenCount: aiEvent.outputTokenCount
        };

        await this.dataStorageService.saveEvent(newEvent);
        generatedEvents.push(newEvent);
        console.log(
          `Created new event: ${eventId} with title "${aiEvent.title}" and ${aiEvent.facts.length} facts`
        );
      } catch (error) {
        console.error(
          `Failed to process event for reporter ${reporterId}:`,
          error
        );
      }
    }

    console.log(
      `Reporter ${reporterId}: Generated ${generatedEvents.length} events`
    );
    return generatedEvents;
  }

  async generateAllReporterEvents(): Promise<{
    [reporterId: string]: Event[];
  }> {
    console.log("Starting event generation for all reporters...");

    // Get all reporters
    const reporters = await this.dataStorageService.getAllReporters();
    if (reporters.length === 0) {
      throw new Error("No reporters available to generate events");
    }

    // Filter to only enabled reporters
    const enabledReporters = reporters.filter((reporter) => reporter.enabled);
    console.log(
      `Found ${reporters.length} total reporters, ${enabledReporters.length} enabled`
    );

    if (enabledReporters.length === 0) {
      console.log("No enabled reporters available to generate events");
      return {};
    }

    const results: { [reporterId: string]: Event[] } = {};

    // Generate events for each enabled reporter
    for (const reporter of enabledReporters) {
      try {
        const events = await this.generateEventsForReporter(reporter.id);
        results[reporter.id] = events;
      } catch (error) {
        console.error(
          `Failed to generate events for reporter ${reporter.id}:`,
          error
        );
        results[reporter.id] = [];
      }
    }

    const totalEvents = Object.values(results).reduce(
      (sum, events) => sum + events.length,
      0
    );
    console.log(
      `Generated ${totalEvents} events across ${enabledReporters.length} enabled reporters`
    );

    return results;
  }

  async getReporterEvents(
    reporterId: string,
    limit?: number
  ): Promise<Event[]> {
    return await this.dataStorageService.getEventsByReporter(reporterId, limit);
  }

  async generateArticlesFromEvents(
    currentTime?: number,
    editor?: Editor | null,
    options?: { published?: boolean; modelName?: string }
  ): Promise<{
    [reporterId: string]: Article[];
  }> {
    console.log("Starting article generation from events for all reporters...");

    // Get editor configuration for model settings
    const ed = editor || (await this.dataStorageService.getEditor());
    if (!ed) {
      throw new Error("Editor configuration not found");
    }

    const usedModelName = options?.modelName?.trim() || ed.articleModelName;

    // Get all reporters
    const reporters = await this.dataStorageService.getAllReporters();
    if (reporters.length === 0) {
      throw new Error(
        "No reporters available to generate articles from events"
      );
    }

    // Filter to only enabled reporters
    const enabledReporters = reporters.filter((reporter) => reporter.enabled);
    console.log(
      `Found ${reporters.length} total reporters, ${enabledReporters.length} enabled`
    );

    if (enabledReporters.length === 0) {
      console.log(
        "No enabled reporters available to generate articles from events"
      );
      return {};
    }

    const results: { [reporterId: string]: Article[] } = {};

    // Generate articles from events for each enabled reporter
    for (const reporter of enabledReporters) {
      try {
        const structuredArticle =
          await this.aiService.generateArticlesFromEvents(
            reporter,
            usedModelName
          );
        if (!structuredArticle) {
          continue;
        } // no article generated, that's fine

        // Check if messageIds is empty - if so, skip generating and saving this article
        if (
          !structuredArticle.response.messageIds ||
          structuredArticle.response.messageIds.length === 0
        ) {
          console.log(
            `Skipping article generation from events for reporter ${reporter.id} - no messageIds returned`
          );
          continue;
        }

        // Extract message texts and source IDs for the used message IDs
        const messageTexts: string[] = [];
        const messageDids: string[] = [];
        const messageRkeys: string[] = [];
        if (
          structuredArticle.response.messageIds &&
          structuredArticle.response.messageIds.length > 0
        ) {
          console.log(
            `Article used message IDs: ${structuredArticle.response.messageIds.join(", ")}`
          );
          const ids = [
            ...new Set(structuredArticle.response.messageIds).union(
              new Set(structuredArticle.response.potentialMessageIds)
            )
          ];
          ids.forEach((x) => {
            const msg = structuredArticle.messages[x - 1];
            messageTexts.push(msg.text);
            messageDids.push(msg.did);
            messageRkeys.push(msg.rkey);
          });
        }

        // Convert structured article to simple Article format for storage
        const article: Article = {
          id: structuredArticle.response.id,
          reporterId: structuredArticle.response.reporterId,
          headline: structuredArticle.response.headline,
          body: `${structuredArticle.response.leadParagraph}\n\n${structuredArticle.response.body}`,
          generationTime: structuredArticle.response.generationTime,
          prompt: structuredArticle.prompt,
          messageIds: structuredArticle.response.messageIds || [],
          messageTexts: messageTexts,
          messageDids: messageDids,
          messageRkeys: messageRkeys,
          modelName: structuredArticle.response.modelName,
          published: options?.published !== false
        };

        await this.dataStorageService.saveArticle(article);
        results[reporter.id] = [article];
        console.log(
          `Generated article from events: "${article.headline}" for reporter ${reporter.id}`
        );
      } catch (error) {
        console.error(
          `Failed to generate article from events for reporter ${reporter.id}:`,
          error
        );
        results[reporter.id] = [];
      }
    }

    const totalArticles = Object.values(results).reduce(
      (sum, articles) => sum + articles.length,
      0
    );
    console.log(
      `Generated ${totalArticles} articles from events across ${enabledReporters.length} enabled reporters`
    );

    return results;
  }
}
