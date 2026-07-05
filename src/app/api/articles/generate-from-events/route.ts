import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { ServiceContainer } from "../../../services/service-container";

// POST /api/articles/generate-from-events - Manually trigger article generation from events
export const POST = withAuth(
  async (request: NextRequest, user, dataStorage) => {
    console.log(
      `[${new Date().toISOString()}] Manual article generation from events triggered by user ${user.id}`
    );

    const container = ServiceContainer.getInstance();
    const reporterService = await container.getReporterService();

    // Generate articles from events
    const results = await reporterService.generateArticlesFromEvents();
    const totalArticles = Object.values(results).reduce(
      (sum, articles) => sum + articles.length,
      0
    );

    console.log(
      `[${new Date().toISOString()}] Manual article generation from events completed - generated ${totalArticles} articles`
    );

    return NextResponse.json({
      success: true,
      message: `Article generation from events completed successfully. Generated ${totalArticles} articles.`,
      totalArticles,
      results
    });
  },
  { requiredRole: "admin" }
);
