import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../../utils/redis";

export const GET = withRedis(
  async (
    request: NextRequest,
    redis,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id: opinionId } = await context.params;

    if (!opinionId) {
      return NextResponse.json(
        { error: "Opinion ID is required" },
        { status: 400 }
      );
    }

    const opinion = await redis.getOpinionArticle(opinionId);

    if (!opinion) {
      return NextResponse.json(
        { error: "Opinion article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(opinion);
  }
);
