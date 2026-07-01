import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../../utils/redis";

// GET /api/articles/public - Get latest articles (public access, no auth required)
export const GET = withRedis(async (request: NextRequest, redis) => {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "5", 10);

  const articles = await redis.getLatestArticles(limit);

  return NextResponse.json(articles);
});
