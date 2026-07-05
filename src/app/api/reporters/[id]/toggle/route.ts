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

// POST /api/reporters/[id]/toggle - Toggle reporter enabled status
export const POST = withAuth(
  async (request: NextRequest, user, dataStorage, context) => {
    const { id: reporterId } = await context.params;

    const container = await getContainer();
    const reporterService = await container.getReporterService();

    // Get current reporter
    const reporter = await dataStorage.getReporter(reporterId);
    if (!reporter) {
      return NextResponse.json(
        { error: "Reporter not found" },
        { status: 404 }
      );
    }

    // Toggle the enabled status
    const newEnabledStatus = !reporter.enabled;
    const updatedReporter = await reporterService.updateReporter(reporterId, {
      enabled: newEnabledStatus
    });

    if (!updatedReporter) {
      return NextResponse.json(
        { error: "Failed to update reporter" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...updatedReporter,
      message: `Reporter ${newEnabledStatus ? "enabled" : "disabled"} successfully`
    });
  },
  { requiredPermission: "editor" }
);
