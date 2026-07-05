import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(
  async (
    _request: NextRequest,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id: editionId } = await context.params;

    if (!editionId) {
      return NextResponse.json(
        { error: "Edition ID is required" },
        { status: 400 }
      );
    }

    const edition = await dataStorage.getNewspaperEdition(editionId);

    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    const articles = await Promise.all(
      edition.stories.map((storyId) => dataStorage.getArticle(storyId))
    );

    const validArticles = articles.filter(
      (article): article is NonNullable<typeof article> => article !== null
    );

    return NextResponse.json({
      ...edition,
      stories: validArticles
    });
  }
);
