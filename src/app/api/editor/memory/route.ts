import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../../utils/redis";

export const GET = withRedis(async (_request: NextRequest, redis) => {
  const memoryInfo = await redis.getMemoryInfo();
  const storageBackend = process.env.DATA_STORAGE_BACKEND || "redis";
  return NextResponse.json({ ...memoryInfo, backend: storageBackend });
});
