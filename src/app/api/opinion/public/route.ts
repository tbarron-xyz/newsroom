import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

// GET /api/opinion/public - Get latest 4 opinion articles (public access, no auth required)
export const GET = withDataStorage(
  async (_request: NextRequest, dataStorage) => {
    const opinions = await dataStorage.getLatestOpinionArticles(4);

    return NextResponse.json({ opinions });
  }
);
