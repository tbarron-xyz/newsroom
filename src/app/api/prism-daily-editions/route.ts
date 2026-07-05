import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";

export const GET = withDataStorage(async (_request: NextRequest, dataStorage) => {
  const pairs = await dataStorage.getPrismDailyEditionPairs(3);
  return NextResponse.json(pairs);
});
