import { NextRequest, NextResponse } from "next/server";
import { ServiceContainer } from "../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

// GET /api/cron/articles - Trigger reporter article generation job
export async function GET(_request: NextRequest) {
  try {
    console.log("\n=== CRON JOB: REPORTER ARTICLE GENERATION ===");
    console.log(
      `[${new Date().toISOString()}] Starting cron-triggered article generation...`
    );

    const container = await getContainer();
    const dataStorage = await container.getDataStorageService();
    const reporterService = await container.getReporterService();

    // Check if we should skip generation based on time constraints
    const editor = await dataStorage.getEditor();
    const currentTime = Date.now();

    if (
      editor?.lastArticleGenerationTime &&
      editor?.articleGenerationPeriodMinutes
    ) {
      const timeSinceLastGeneration =
        (currentTime - editor.lastArticleGenerationTime) / (1000 * 60); // Convert to minutes
      const requiredInterval = editor.articleGenerationPeriodMinutes;

      if (timeSinceLastGeneration < requiredInterval) {
        const remainingMinutes = Math.ceil(
          requiredInterval - timeSinceLastGeneration
        );
        console.log(
          `[${new Date().toISOString()}] Skipping generation - only ${timeSinceLastGeneration.toFixed(1)} minutes have passed since last run. Need ${requiredInterval} minutes. ${remainingMinutes} minutes remaining.`
        );
        console.log("Cron job skipped due to time constraints\n");

        return NextResponse.json({
          success: true,
          message: `Article generation skipped - ${remainingMinutes} minutes remaining until next allowed generation.`,
          skipped: true,
          nextGenerationInMinutes: remainingMinutes
        });
      }
    }

    // Set job as running and update last run time
    await dataStorage.setJobRunning("reporter", true);
    await dataStorage.setJobLastRun("reporter", currentTime);
    console.log(
      `[${new Date().toISOString()}] Set reporter job running=true and last_run=${currentTime}`
    );

    try {
      // Proceed with generation
      const results = await reporterService.generateAllReporterArticles();
      const totalArticles = Object.values(results).reduce(
        (sum, articles) => sum + articles.length,
        0
      );

      // Update the last generation time
      if (editor) {
        const updatedEditor = {
          ...editor,
          lastArticleGenerationTime: currentTime
        };
        await dataStorage.saveEditor(updatedEditor);
        console.log(
          `[${new Date().toISOString()}] Updated last generation time to ${new Date(currentTime).toISOString()}`
        );
      }

      // Mark job as completed successfully
      await dataStorage.setJobRunning("reporter", false);
      await dataStorage.setJobLastSuccess("reporter", currentTime);
      console.log(
        `[${new Date().toISOString()}] Set reporter job running=false and last_success=${currentTime}`
      );

      console.log(
        `[${new Date().toISOString()}] Successfully generated ${totalArticles} articles`
      );
      console.log("Cron job completed successfully\n");

      return NextResponse.json({
        success: true,
        message: `Reporter article generation job completed successfully. Generated ${totalArticles} articles.`,
        totalArticles,
        lastGenerationTime: currentTime
      });
    } catch (error) {
      // Mark job as not running on error (don't update last_success)
      await dataStorage.setJobRunning("reporter", false);
      console.log(
        `[${new Date().toISOString()}] Set reporter job running=false due to error`
      );
      throw error; // Re-throw to be handled by outer catch
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron job failed:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute reporter article generation job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
