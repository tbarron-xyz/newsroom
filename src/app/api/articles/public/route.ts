import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

// GET /api/articles/public - Get latest articles (public access, no auth required)
export const GET = withDataStorage(
  async (request: NextRequest, dataStorage) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);

    const articles = await dataStorage.getLatestPublishedArticles(limit);

    return NextResponse.json(articles);
  }
);
