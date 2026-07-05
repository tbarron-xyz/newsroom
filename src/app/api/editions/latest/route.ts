import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(
  async (_request: NextRequest, dataStorage) => {
    const editions = await dataStorage.getLatestEditions(25);
    return NextResponse.json(editions);
  }
);
