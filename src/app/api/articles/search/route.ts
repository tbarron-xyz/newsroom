import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(
  async (request: NextRequest, dataStorage) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const articles = await dataStorage.searchArticles(q.trim(), limit);

    return NextResponse.json(articles);
  }
);
