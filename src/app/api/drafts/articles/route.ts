import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";

export const GET = withAuth(
  async (request: NextRequest, _user, dataStorage) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const articles = await dataStorage.getDraftArticles(limit);

    return NextResponse.json(articles);
  },
  { requiredPermission: "editor" }
);
