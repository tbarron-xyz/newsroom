import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { AuthService } from "../../services/auth.service";
import { AbilitiesService } from "../../services/abilities.service";

// GET /api/daily-editions - Get daily editions (limited to 3 results for all users)
export const GET = withDataStorage(async (request: NextRequest, dataStorage) => {
  // Limit to 3 results for all users
  const limit = 3;
  const dailyEditions = await dataStorage.getDailyEditions(limit);

  return NextResponse.json(dailyEditions);
});

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
