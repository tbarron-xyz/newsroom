import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";

// GET /api/articles/all - Get all articles (requires Reader permission)
export const GET = withAuth(
  async (request: NextRequest, user, dataStorage) => {
    // Parse and validate results parameter
    const { searchParams } = new URL(request.url);
    const resultsParam = searchParams.get("results");
    let limit = 100; // default
    if (resultsParam) {
      const parsed = parseInt(resultsParam, 10);
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: "results parameter must be a positive integer" },
          { status: 400 }
        );
      }
      limit = parsed;
    }

    // Get all articles with limit
    const articles = await dataStorage.getLatestArticles(limit);

    return NextResponse.json(articles);
  },
  { requiredPermission: "reader" }
);
