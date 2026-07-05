import { NextRequest, NextResponse } from "next/server";
import { ServiceContainer } from "../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

// GET /api/logs/latest - Get all app logs
export async function GET(_request: NextRequest) {
  try {
    const container = await getContainer();
    const dataStorage = await container.getDataStorageService();

    const logs = await dataStorage.getAllLogs();

    return NextResponse.json({
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch logs",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
