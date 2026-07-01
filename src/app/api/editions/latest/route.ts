import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../../utils/redis";

export const GET = withRedis(async (_request: NextRequest, redis) => {
  const editions = await redis.getLatestEditions(25);
  return NextResponse.json(editions);
});
