import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

// GET /api/events/public - Get latest 12 events sorted by updated time (public access, no auth required)
export const GET = withDataStorage(
  async (_request: NextRequest, dataStorage) => {
    // Get latest 12 events sorted by updated time (most recent first)
    const events = await dataStorage.getLatestUpdatedEvents(12);

    return NextResponse.json(events);
  }
);
