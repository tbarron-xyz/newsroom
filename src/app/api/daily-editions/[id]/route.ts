import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(
  async (
    _request: NextRequest,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await context.params;

    const dailyEdition = await dataStorage.getDailyEdition(id);
    if (!dailyEdition) {
      return NextResponse.json({ error: "Daily edition not found" }, { status: 404 });
    }

    const enrichedEditions = await Promise.all(
      dailyEdition.editions.map(async (editionId) => {
        const edition = await dataStorage.getNewspaperEdition(editionId);
        if (!edition) return null;

        const articles = (await Promise.all(
          edition.stories.map((storyId) => dataStorage.getArticle(storyId))
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
