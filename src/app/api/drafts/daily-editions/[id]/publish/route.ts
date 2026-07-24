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

    const edition = await dataStorage.getDailyEdition(id);
    if (!edition) {
      return NextResponse.json(
        { error: "Daily edition not found" },
        { status: 404 }
      );
    }

    edition.published = true;
    await dataStorage.saveDailyEdition(edition);

    return NextResponse.json({ success: true, edition });
  },
  { requiredPermission: "editor" }
);
