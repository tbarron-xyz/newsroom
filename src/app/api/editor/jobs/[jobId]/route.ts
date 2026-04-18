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
    const { jobId } = context.params;
    const container = await getContainer();
    const jobQueueService = await container.getJobQueueService();

    try {
      let status;
      // Try daily queue first
      status = await jobQueueService.getJobStatus("daily_edition", jobId);
      if (!status) {
        // Try reporter queue
        status = await jobQueueService.getJobStatus("reporter_articles", jobId);
      }
      if (!status) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json(status);
    } catch (error) {
      console.error("Error fetching job status:", error);
      return NextResponse.json(
        { error: "Failed to fetch job status" },
        { status: 500 }
      );
    }
  },
  { requiredRole: "admin" }
);
