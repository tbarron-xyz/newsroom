import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { ServiceContainer } from "../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

export const GET = withAuth(
  async (
    _request: NextRequest,
    _user,
    _dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await context.params;
      const container = await getContainer();
      const dataStorage = await container.getDataStorageService();
      const entry = await dataStorage.getResearchEntry(id);

      if (!entry) {
        return NextResponse.json(
          { error: "Research entry not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(entry);
    } catch (error) {
      console.error("Error fetching research entry:", error);
      return NextResponse.json(
        { error: "Failed to fetch research entry" },
        { status: 500 }
      );
    }
  }
);
