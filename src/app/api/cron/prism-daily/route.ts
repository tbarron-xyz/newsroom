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
    console.log("\n=== CRON JOB: PRISM DAILY EDITION GENERATION ===");
    console.log(
      `[${new Date().toISOString()}] Starting cron-triggered prism daily edition generation...`
    );

    const container = await getContainer();
    const editorService = await container.getEditorService();

    const result = await editorService.runJob("prism-daily");

    console.log("Prism daily cron job completed successfully\n");
    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Prism daily cron failed:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate prism daily edition pair",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
