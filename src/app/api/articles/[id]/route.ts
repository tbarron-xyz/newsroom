import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";
import { withAuth } from "../../../utils/auth";

export const GET = withDataStorage(
  async (
    request: NextRequest,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id: articleId } = await context.params;

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    const article = await dataStorage.getArticle(articleId);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  }
);

export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id: articleId } = await context.params;

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    try {
      const deleted = await dataStorage.deleteArticle(articleId);
      if (!deleted) {
        return NextResponse.json(
          { error: "Article not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      return NextResponse.json(
        { error: "Failed to delete article" },
        { status: 500 }
      );
    }
  },
  { requiredPermission: "editor" }
);
