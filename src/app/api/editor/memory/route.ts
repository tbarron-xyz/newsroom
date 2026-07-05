import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(async (_request: NextRequest, dataStorage) => {
  const memoryInfo = await dataStorage.getMemoryInfo();
  const storageBackend = process.env.DATA_STORAGE_BACKEND || "redis";
  return NextResponse.json({ ...memoryInfo, backend: storageBackend });
});
