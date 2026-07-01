import { NextResponse } from "next/server";
import { ServiceContainer } from "../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

export async function GET() {
  try {
    const container = await getContainer();
    const dataStorage = await container.getDataStorageService();
    const ticker = await dataStorage.getLatestTicker();

    if (!ticker) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json(ticker);
  } catch (error) {
    console.error("Error fetching ticker:", error);
    return NextResponse.json({ text: "" });
  }
}
