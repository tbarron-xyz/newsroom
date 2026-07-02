import { NextRequest, NextResponse } from "next/server";
import { ServiceContainer } from "../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

export async function GET(_request: NextRequest) {
  try {
    console.log("\n=== CRON JOB: OPINION ARTICLE GENERATION ===");
    console.log(
      `[${new Date().toISOString()}] Starting cron-triggered opinion article generation...`
    );

    const container = await getContainer();
    const editorService = await container.getEditorService();

    const result = await editorService.runJob("opinion", {
      enforceTimeConstraint: true
    });

    if (result.skipped) {
      console.log("Cron job skipped due to time constraints\n");
      return NextResponse.json({
        success: true,
        message: result.message,
        skipped: true,
        nextGenerationInMinutes: result.nextGenerationInMinutes
      });
    }

    console.log("Cron job completed successfully\n");
    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron job failed:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute opinion article generation job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
