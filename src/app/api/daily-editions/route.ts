import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";

// GET /api/daily-editions - Get daily editions (limited to 3 published results for all users)
export const GET = withDataStorage(
  async (request: NextRequest, dataStorage) => {
    const allEditions = await dataStorage.getDailyEditions();
    const published = allEditions.filter((e) => e.published !== false);
    return NextResponse.json(published.slice(0, 3));
  }
);

// POST /api/daily-editions - Generate a new daily edition (placeholder for now)
export async function POST() {
  try {
    // For now, return a message that this feature is not yet implemented
    // In a full implementation, this would call the AI service to generate a new daily edition
    return NextResponse.json(
      { error: "Daily edition generation not yet implemented in API" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error generating daily edition:", error);
    return NextResponse.json(
      { error: "Failed to generate daily edition" },
      { status: 500 }
    );
  }
}
