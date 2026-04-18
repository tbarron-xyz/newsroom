import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../utils/auth";
import { ServiceContainer } from "../../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

export const GET = withAuth(
  async (request: NextRequest, user, dataStorage, context) => {
    const container = await getContainer();
    const jobQueueService = await container.getJobQueueService();

    try {
      const jobId = await jobQueueService.getActiveJobId("daily_edition");
      return NextResponse.json({ jobId });
    } catch (error) {
      console.error("Error fetching latest daily job:", error);
      return NextResponse.json(
        { error: "Failed to fetch latest daily job" },
        { status: 500 }
      );
    }
  },
  { requiredRole: "admin" }
);
