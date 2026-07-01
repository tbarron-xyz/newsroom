import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../../utils/redis";

// GET /api/opinion/public - Get latest 4 opinion articles (public access, no auth required)
export const GET = withRedis(async (_request: NextRequest, redis) => {
  const opinions = await redis.getLatestOpinionArticles(4);

  return NextResponse.json({ opinions });
});
