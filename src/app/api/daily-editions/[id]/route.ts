import { NextRequest, NextResponse } from "next/server";
import { withRedis } from "../../../utils/redis";

export const GET = withRedis(
  async (
    _request: NextRequest,
    redis,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await context.params;

    const dailyEdition = await redis.getDailyEdition(id);
    if (!dailyEdition) {
      return NextResponse.json({ error: "Daily edition not found" }, { status: 404 });
    }

    const enrichedEditions = await Promise.all(
      dailyEdition.editions.map(async (editionId) => {
        const edition = await redis.getNewspaperEdition(editionId);
        if (!edition) return null;

        const articles = (await Promise.all(
          edition.stories.map((storyId) => redis.getArticle(storyId))
        )).filter(Boolean);

        return { ...edition, stories: articles };
      })
    );

    return NextResponse.json({
      ...dailyEdition,
      editions: enrichedEditions.filter(Boolean),
    });
  }
);
