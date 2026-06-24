import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../utils/redis";

export const GET = withRedis(async (_request: NextRequest, redis) => {
  const pairs = await redis.getPrismDailyEditionPairs(3);
  return NextResponse.json(pairs);
});
