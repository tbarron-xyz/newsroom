import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(
  async (
    request: NextRequest,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id: opinionId } = await context.params;

    if (!opinionId) {
      return NextResponse.json(
        { error: "Opinion ID is required" },
        { status: 400 }
      );
    }

    const opinion = await dataStorage.getOpinionArticle(opinionId);

    if (!opinion) {
      return NextResponse.json(
        { error: "Opinion article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(opinion);
  }
);
