import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../utils/auth";
import { ServiceContainer } from "../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

export const GET = withAuth(
  async (_request: NextRequest, _user, _dataStorage) => {
    try {
      const container = await getContainer();
      const dataStorage = await container.getDataStorageService();
      const entries = await dataStorage.getLatestResearchEntries(50);

      const result = entries.map((entry) => ({
        id: entry.id,
        topic: entry.topic,
        goal: entry.goal,
        generationTime: entry.generationTime,
        status: entry.status,
        suggestionCount: entry.suggestions.length
      }));

      return NextResponse.json({ research: result });
    } catch (error) {
      console.error("Error fetching research entries:", error);
      return NextResponse.json(
        { error: "Failed to fetch research entries" },
        { status: 500 }
      );
    }
  }
);
