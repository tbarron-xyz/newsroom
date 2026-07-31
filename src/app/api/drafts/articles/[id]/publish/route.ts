import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../../utils/auth";

export const POST = withAuth(
  async (
    request: NextRequest,
    user,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await context.params;

    const article = await dataStorage.getArticle(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    article.published = true;
    await dataStorage.saveArticle(article);

    return NextResponse.json({ success: true, article });
  },
  { requiredPermission: "editor" }
);
