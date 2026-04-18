import {
  NewspaperEdition,
  DailyEdition,
  Article,
  Editor
} from "../schemas/types";
import { IDataStorageService } from "./data-storage.interface";
import { AIService } from "./ai.service";
import { ReporterService } from "./reporter.service";
import { PERSONA_DISPLAY_NAMES } from "./ai-prompts";
import { fetchLatestMessages } from "./bluesky.service";
import { ServiceContainer } from "./service-container";

export type JobType =
  | "reporter"
  | "newspaper"
  | "daily"
  | "comments"
  | "events";

export interface JobResult {
  message: string;
  jobType: JobType;
  skipped?: boolean;
  nextGenerationInMinutes?: number;
}

export class EditorService {
  constructor(
    private dataStorageService: IDataStorageService,
    private aiService: AIService,
    private reporterService?: ReporterService
  ) {}

  async generateHourlyEdition(): Promise<NewspaperEdition> {
    console.log("Editor: Starting newspaper edition generation...");

    // Get articles from the last 3 hours using global index (single query)
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    const allRecentArticles =
      await this.dataStorageService.getArticlesInTimeRangeGlobal(
        threeHoursAgo,
        Date.now()
      );

    if (allRecentArticles.length === 0) {
      throw new Error("No articles found in the last 3 hours");
    }

    console.log(
      `Found ${allRecentArticles.length} articles from the last 3 hours`
    );

    // Get editor information
    const editor = await this.dataStorageService.getEditor();
    if (!editor) {
      throw new Error("No editor configuration found");
    }

    // Use AI to select newsworthy stories
    const {
      selectedArticles,
      fullPrompt,
      modelName,
      inputTokenCount,
      outputTokenCount
    } = await this.aiService.selectNewsworthyStories(
      allRecentArticles,
      editor.prompt,
      editor.storySelectionModelName
    );

    console.log(
      `Selected ${selectedArticles.length} newsworthy stories for the edition`
    );

    // Create newspaper edition
    const editionId = await this.dataStorageService.generateId("edition");
    const edition: NewspaperEdition = {
      id: editionId,
      stories: selectedArticles.map((article) => article.id),
      generationTime: Date.now(),
      prompt: fullPrompt,
      modelName: modelName,
      inputTokenCount,
      outputTokenCount
    };

    // Save the edition
    await this.dataStorageService.saveNewspaperEdition(edition);

    console.log(
      `Newspaper edition ${editionId} generated with ${selectedArticles.length} stories`
    );
    return edition;
  }

  async generateDailyEdition(): Promise<DailyEdition> {
    console.log("Editor: Starting daily edition generation...");

    // Get newspaper editions from the last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentEditions = await this.dataStorageService.getNewspaperEditions();

    // Filter to only editions from the last 24 hours
    const last24HoursEditions = recentEditions.filter(
      (edition) => edition.generationTime >= twentyFourHoursAgo
    );

    if (last24HoursEditions.length === 0) {
      throw new Error("No newspaper editions found in the last 24 hours");
    }

    console.log(
      `Found ${last24HoursEditions.length} newspaper editions from the last 24 hours`
    );

    // Get editor information
    const editor = await this.dataStorageService.getEditor();
    if (!editor) {
      throw new Error("No editor configuration found");
    }

    // Prepare detailed edition information with articles
    const detailedEditions = await Promise.all(
      last24HoursEditions.map(async (edition) => {
        const articles: Array<{ headline: string; body: string }> = [];
        for (const articleId of edition.stories) {
          const article = await this.dataStorageService.getArticle(articleId);
          if (article) {
            articles.push({
              headline: article.headline,
              body: article.body
            });
          }
        }
        return {
          id: edition.id,
          articles
        };
      })
    );

    // Use AI to generate comprehensive daily edition content
    const {
      content: dailyEditionContent,
      fullPrompt,
      modelName,
      inputTokenCount,
      outputTokenCount
    } = await this.aiService.selectNotableEditions(
      detailedEditions,
      editor.prompt,
      editor.editionSelectionModelName
    );

    console.log(
      `Generated comprehensive daily edition with ${dailyEditionContent.topics.length} topics`
    );

    // Create daily edition with the new detailed format
    const dailyEditionId =
      await this.dataStorageService.generateId("daily_edition");
    const dailyEdition: DailyEdition = {
      id: dailyEditionId,
      editions: last24HoursEditions.map((edition) => edition.id), // Keep all edition IDs for reference
      generationTime: Date.now(),
      // Add the new detailed content
      frontPageHeadline: dailyEditionContent.frontPageHeadline,
      frontPageArticle: dailyEditionContent.frontPageArticle,
      topics: dailyEditionContent.topics,
      prompt: fullPrompt,
      modelName: modelName,
      inputTokenCount,
      outputTokenCount
    };

    // Save the daily edition
    await this.dataStorageService.saveDailyEdition(dailyEdition);

    console.log(
      `Daily edition ${dailyEditionId} generated with comprehensive content${dailyEdition.newspaperName ? ` for ${dailyEdition.newspaperName}` : ""}`
    );
    return dailyEdition;
  }

  async getLatestNewspaperEdition(): Promise<NewspaperEdition | null> {
    const editions = await this.dataStorageService.getNewspaperEditions(1);
    return editions.length > 0 ? editions[0] : null;
  }

  async getLatestDailyEdition(): Promise<DailyEdition | null> {
    const dailyEditions = await this.dataStorageService.getDailyEditions(1);
    return dailyEditions.length > 0 ? dailyEditions[0] : null;
  }

  async getEditionWithArticles(
    editionId: string
  ): Promise<{ edition: NewspaperEdition; articles: Article[] } | null> {
    const edition =
      await this.dataStorageService.getNewspaperEdition(editionId);
    if (!edition) return null;

    const articles: Article[] = [];
    for (const articleId of edition.stories) {
      const article = await this.dataStorageService.getArticle(articleId);
      if (article) {
        articles.push(article);
      }
    }

    return { edition, articles };
  }

  async getDailyEditionWithEditions(dailyEditionId: string): Promise<{
    dailyEdition: DailyEdition;
    editions: NewspaperEdition[];
  } | null> {
    const dailyEdition =
      await this.dataStorageService.getDailyEdition(dailyEditionId);
    if (!dailyEdition) return null;

    const editions: NewspaperEdition[] = [];
    for (const editionId of dailyEdition.editions) {
      const edition =
        await this.dataStorageService.getNewspaperEdition(editionId);
      if (edition) {
        editions.push(edition);
      }
    }

    return { dailyEdition, editions };
  }

  async generateComment(count: number = 1): Promise<Array<{ topicIndex: number; author: string }>> {
    const currentTime = Date.now();

    const dailyEditions = await this.dataStorageService.getDailyEditions(1);
    if (dailyEditions.length === 0) {
      throw new Error("No daily editions available to comment on");
    }

    const dailyEdition = dailyEditions[0];

    const originalIndices = dailyEdition.topics.map((_, i) => i);
    const shuffledIndices = [...originalIndices].sort(
      () => 0.5 - Math.random()
    );
    const shuffledTopics = shuffledIndices.map((i) => dailyEdition.topics[i]);

    const dailyEditionText = [
      `Front Page Headline: ${dailyEdition.frontPageHeadline}`,
      `Front Page Article: ${dailyEdition.frontPageArticle}`,
      "",
      "Stories:",
      ...shuffledTopics.map(
        (topic, index) =>
          `Story ${index}: ${topic.name}\nHeadline: ${topic.headline}\nSummary: ${topic.oneLineSummary}\nFirst Paragraph: ${topic.newsStoryFirstParagraph}\nSecond Paragraph: ${topic.newsStorySecondParagraph}`
      )
    ].join("\n\n");

    const existingComments: Array<{ author: string; content: string }> = [];
    for (const topic of dailyEdition.topics) {
      if (topic.comments) {
        for (const comment of topic.comments) {
          existingComments.push({
            author: comment.author,
            content: comment.content
          });
        }
      }
    }

    const recentPosts = await fetchLatestMessages(20)
      .then((msgs) => msgs.map((m) => m.text))
      .catch(() => []);

    const results = [];
    for (let i = 0; i < count; i++) {
      const result = await this.aiService.generateComment(
        dailyEditionText,
        existingComments,
        undefined,
        recentPosts
      );

      if (!result) {
        throw new Error("Failed to generate comment");
      }

      const shuffledTopicIndex = result.topicIndex;
      if (shuffledTopicIndex < 0 || shuffledTopicIndex >= shuffledTopics.length) {
        throw new Error(`Invalid shuffled topic index: ${shuffledTopicIndex}`);
      }

      const topicIndex = shuffledIndices[shuffledTopicIndex];
      if (topicIndex < 0 || topicIndex >= dailyEdition.topics.length) {
        throw new Error(`Invalid original topic index: ${topicIndex}`);
      }

      if (!dailyEdition.topics[topicIndex].comments) {
        dailyEdition.topics[topicIndex].comments = [];
      }

      const newComment = {
        author: result.persona,
        content: result.commentText,
        createdAt: currentTime,
        persona: result.persona
      };
      dailyEdition.topics[topicIndex].comments!.push(newComment);

      // Add to existing comments to avoid duplicate generation
      existingComments.push({
        author: newComment.author,
        content: newComment.content
      });

      results.push({ topicIndex, author: newComment.author });
    }

    await this.dataStorageService.saveDailyEdition(dailyEdition);

    return results;
  }

  async runJob(
    jobType: JobType,
    options: { enforceTimeConstraint?: boolean; count?: number } = {}
  ): Promise<JobResult> {
    const { enforceTimeConstraint = false } = options;
    const currentTime = Date.now();
    const editor = await this.dataStorageService.getEditor();

    const skipResult = await this.checkTimeConstraint(
      jobType,
      currentTime,
      editor,
      enforceTimeConstraint
    );
    if (skipResult) {
      return skipResult;
    }

    await this.dataStorageService.setJobRunning(jobType, true);
    await this.dataStorageService.setJobLastRun(jobType, currentTime);
    console.log(
      `[${new Date().toISOString()}] Set ${jobType} job running=true and last_run=${currentTime}`
    );

    try {
      const result = await this.executeJob(jobType, currentTime, editor, options);

      await this.dataStorageService.setJobRunning(jobType, false);
      await this.dataStorageService.setJobLastSuccess(jobType, currentTime);
      console.log(
        `[${new Date().toISOString()}] Set ${jobType} job running=false and last_success=${currentTime}`
      );

      return result;
    } catch (error) {
      await this.dataStorageService.setJobRunning(jobType, false);
      console.log(
        `[${new Date().toISOString()}] Set ${jobType} job running=false due to error`
      );
      throw error;
    }
  }

  private async checkTimeConstraint(
    jobType: JobType,
    currentTime: number,
    editor: Editor | null,
    enforceTimeConstraint: boolean
  ): Promise<JobResult | null> {
    if (!enforceTimeConstraint || !editor) {
      return null;
    }

    let lastGenerationTime: number | undefined;
    let periodMinutes: number | undefined;

    switch (jobType) {
      case "events":
        lastGenerationTime = editor.lastEventGenerationTime;
        periodMinutes = editor.eventGenerationPeriodMinutes;
        break;
      case "reporter":
        lastGenerationTime = editor.lastArticleGenerationTime;
        periodMinutes = editor.articleGenerationPeriodMinutes;
        break;
      case "newspaper":
        lastGenerationTime = editor.lastEditionGenerationTime;
        periodMinutes = editor.editionGenerationPeriodMinutes;
        break;
      case "comments":
        const lastSuccess =
          await this.dataStorageService.getJobLastSuccess("comments");
        if (lastSuccess) {
          const hoursSinceLastSuccess =
            (currentTime - lastSuccess) / (1000 * 60 * 60);
          if (hoursSinceLastSuccess < 24) {
            console.log(
              `[${new Date().toISOString()}] Skipping comment generation: Only ${hoursSinceLastSuccess.toFixed(1)} hours since last run`
            );
            return {
              message:
                "Comment generation skipped: ran within the last 24 hours",
              jobType,
              skipped: true
            };
          }
        }
        return null;
      case "daily":
        return null;
    }

    if (!lastGenerationTime || !periodMinutes) {
      return null;
    }

    const timeSinceLastGeneration =
      (currentTime - lastGenerationTime) / (1000 * 60);
    if (timeSinceLastGeneration < periodMinutes) {
      const remainingMinutes = Math.ceil(
        periodMinutes - timeSinceLastGeneration
      );
      console.log(
        `[${new Date().toISOString()}] Skipping ${jobType} generation - only ${timeSinceLastGeneration.toFixed(1)} minutes have passed since last run. Need ${periodMinutes} minutes. ${remainingMinutes} minutes remaining.`
      );
      return {
        message: `${jobType} generation skipped - ${remainingMinutes} minutes remaining until next allowed generation.`,
        jobType,
        skipped: true,
        nextGenerationInMinutes: remainingMinutes
      };
    }

    return null;
  }

  private async executeJob(
    jobType: JobType,
    currentTime: number,
    editor: Editor | null,
    options: { count?: number }
  ): Promise<JobResult> {
    switch (jobType) {
      case "events": {
        if (!this.reporterService) {
          throw new Error("Reporter service not available");
        }
        const results = await this.reporterService.generateAllReporterEvents();
        const totalEvents = Object.values(results).reduce(
          (sum, events) => sum + events.length,
          0
        );

        if (editor) {
          const updatedEditor = {
            ...editor,
            lastEventGenerationTime: currentTime
          };
          await this.dataStorageService.saveEditor(updatedEditor);
          console.log(
            `[${new Date().toISOString()}] Updated last event generation time to ${new Date(currentTime).toISOString()}`
          );
        }

        console.log(
          `[${new Date().toISOString()}] Successfully generated ${totalEvents} events`
        );
        return {
          message: `Reporter event generation job completed successfully. Generated ${totalEvents} events.`,
          jobType
        };
      }

      case "reporter": {
        if (!this.reporterService) {
          throw new Error("Reporter service not available");
        }
        const results = await this.reporterService.generateArticlesFromEvents();
        const totalArticles = Object.values(results).reduce(
          (sum, articles) => sum + articles.length,
          0
        );

        if (editor) {
          const updatedEditor = {
            ...editor,
            lastArticleGenerationTime: currentTime
          };
          await this.dataStorageService.saveEditor(updatedEditor);
          console.log(
            `[${new Date().toISOString()}] Updated last article generation time to ${new Date(currentTime).toISOString()}`
          );
        }

        console.log(
          `[${new Date().toISOString()}] Successfully generated ${totalArticles} articles from events`
        );
        return {
          message: `Reporter article generation job completed successfully. Generated ${totalArticles} articles.`,
          jobType
        };
      }

      case "newspaper": {
        const edition = await this.generateHourlyEdition();

        if (editor) {
          const updatedEditor = {
            ...editor,
            lastEditionGenerationTime: currentTime
          };
          await this.dataStorageService.saveEditor(updatedEditor);
          console.log(
            `[${new Date().toISOString()}] Updated last edition generation time to ${new Date(currentTime).toISOString()}`
          );
        }

        console.log(
          `[${new Date().toISOString()}] Successfully generated hourly edition ${edition.id}`
        );
        return {
          message: `Newspaper edition generation job completed successfully. Created edition ${edition.id} with ${edition.stories.length} stories.`,
          jobType
        };
      }

      case "daily": {
        const dailyEdition = await this.generateDailyEdition();
        console.log(
          `[${new Date().toISOString()}] Successfully generated daily edition ${dailyEdition.id}`
        );

        // Generate dynamic personas
        const editionText = `${dailyEdition.frontPageArticle}\n${dailyEdition.topics.map((t) => t.headline + "\n" + t.newsStoryFirstParagraph).join("\n")}`;
        const aiService = await ServiceContainer.getInstance().getAIService();
        const dynamicPersonas =
          await aiService.generateDynamicPersonas(editionText);
        await this.dataStorageService.setDynamicPersonas(dynamicPersonas, 24); // TTL 24 hours
        console.log(
          `[${new Date().toISOString()}] Generated ${dynamicPersonas.length} dynamic personas`
        );

        return {
          message: `Daily edition generation job completed successfully. Created edition ${dailyEdition.id} with ${dailyEdition.editions.length} newspaper editions.`,
          jobType
        };
      }

      case "comments": {
        const count = options.count || 1;
        const results = await this.generateComment(count);
        console.log(
          `[${new Date().toISOString()}] Successfully added ${count} comments to topics ${results.map(r => r.topicIndex).join(', ')}`
        );
        return {
          message: `Comment generation job completed successfully. Added ${count} comments.`,
          jobType
        };
      }
    }
  }
}
