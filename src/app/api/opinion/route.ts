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
      const opinions = await dataStorage.getLatestOpinionArticles(50);
      return NextResponse.json({ opinions });
    } catch (error) {
      console.error("Error fetching opinion articles:", error);
      return NextResponse.json(
        { error: "Failed to fetch opinion articles" },
        { status: 500 }
      );
    }
  }
);
