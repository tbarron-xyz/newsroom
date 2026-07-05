import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../utils/auth";
import { ServiceContainer } from "../../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

// POST /api/reporters/[id]/generate-article - Generate an article for a specific reporter
export const POST = withAuth(
  async (request: NextRequest, user, dataStorage, context) => {
    const { id: reporterId } = await context.params;

    // Verify reporter exists
    const reporter = await dataStorage.getReporter(reporterId);
    if (!reporter) {
      return NextResponse.json(
        { error: "Reporter not found" },
        { status: 404 }
      );
    }

    const container = await getContainer();
    const reporterService = await container.getReporterService();

    try {
      const articles =
        await reporterService.generateArticlesForReporter(reporterId);

      if (articles.length === 0) {
        return NextResponse.json({
          success: true,
          message:
            "No articles were generated — no suitable source messages found.",
          articles: []
        });
      }

      return NextResponse.json({
        success: true,
        message: `Generated article: "${articles[0].headline}"`,
        articles
      });
    } catch (error) {
      console.error(
        `Error generating article for reporter ${reporterId}:`,
        error
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate article",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  },
  { requiredPermission: "reporter" }
);
