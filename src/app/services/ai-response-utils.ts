import { writeFile } from "fs/promises";
import { join } from "path";
import {
  ArticleGenerationMetadata,
  EventGenerationMetadata
} from "../schemas/types";

export class AIResponseUtils {
  static async saveResponseToFile(
    response: any,
    prefix: string,
    timestamp: number
  ): Promise<void> {
    try {
      const responseFilePath = join(
        process.cwd(),
        "api_responses",
        `${prefix}_${timestamp}.json`
      );
      await writeFile(responseFilePath, JSON.stringify(response, null, 2));
    } catch (error) {
      console.warn("Failed to save AI response to file:", error);
      // Continue with article generation even if file save fails
    }
  }

  static createArticleMetadata(
    articleId: string,
    reporterId: string,
    generationTime: number,
    modelName: string,
    body: string,
    tokenUsage?: { prompt_tokens?: number; completion_tokens?: number }
  ): ArticleGenerationMetadata {
    return {
      id: articleId,
      reporterId,
      generationTime,
      wordCount: body.split(" ").length,
      modelName,
      inputTokenCount: tokenUsage?.prompt_tokens,
      outputTokenCount: tokenUsage?.completion_tokens
    };
  }

  static createEventMetadata(
    modelName: string,
    tokenUsage?: { prompt_tokens?: number; completion_tokens?: number }
  ): EventGenerationMetadata {
    return {
      modelName,
      inputTokenCount: tokenUsage?.prompt_tokens,
      outputTokenCount: tokenUsage?.completion_tokens
    };
  }

  static formatSocialMediaContext(
    messages: Array<{ did: string; text: string; time: number }>
  ): string {
    if (messages.length === 0) {
      return "";
    }

    const formattedMessages: string[] = [];

    for (let i = 0; i < messages.length; i++) {
      formattedMessages.push(`${i + 1}. "${messages[i].text}"`);
    }

    return `\n\nRecent social media discussions:\n${formattedMessages.join("\n")}`;
  }

  static formatArticlesText(articles: any[]): string {
    return articles
      .map(
        (article, index) =>
          `Article ${index + 1}:\nHeadline: ${article.headline}\nContent: ${article.body.substring(0, 300)}...`
      )
      .join("\n\n");
  }

  static formatEditionsText(
    editions: Array<{
      id: string;
      articles: Array<{ headline: string; body: string }>;
    }>
  ): string {
    return editions
      .map((edition, index) => {
        const articlesText = edition.articles
          .map(
            (article, articleIndex) =>
              `Article ${articleIndex + 1}:\nHeadline: ${article.headline}\nFirst Paragraph: ${article.body.split("\n")[0] || article.body.substring(0, 200)}`
          )
          .join("\n\n");
        return `Edition ${index + 1} (ID: ${edition.id}):\n${articlesText}`;
      })
      .join("\n\n");
  }

  static formatEventsContext(events: any[]): string {
    if (events.length === 0) {
      return "No previous events available.";
    }
    return events
      .map(
        (event, index) =>
          `Title: ${event.title}\nFacts: ${event.facts.join(", ")}\nCreated: ${new Date(event.createdTime).toISOString()}`
      )
      .join("\n\n");
  }

  static formatArticlesFullText(
    articles: Array<{ headline: string; body: string }>
  ): string {
    return articles
      .map(
        (article, index) =>
          `Article ${index + 1}:\nHeadline: ${article.headline}\nFull Text:\n${article.body}`
      )
      .join("\n\n---\n\n");
  }

  static formatArticlesContext(articles: any[]): string {
    if (articles.length === 0) {
      return "No previous articles available for this reporter.";
    }
    return articles
      .map((article, index) => `Article ${index + 1}: "${article.headline}"`)
      .join("\n");
  }
}
