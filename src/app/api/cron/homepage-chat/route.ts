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
    console.log("\n=== CRON JOB: HOMEPAGE CHAT VISITOR MESSAGE ===");
    console.log(
      `[${new Date().toISOString()}] Starting cron-triggered homepage chat visitor message...`
    );

    const container = await getContainer();
    const editorService = await container.getEditorService();

    const result = await editorService.runJob("homepage-chat", {
      enforceTimeConstraint: false
    });

    console.log(
      "Homepage chat visitor message cron job completed successfully\n"
    );

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Homepage chat visitor message cron job failed:`,
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute homepage chat visitor message job",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
