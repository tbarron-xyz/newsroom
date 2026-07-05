import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { withDataStorage } from "../../../utils/data-storage";
import { ServiceContainer } from "../../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

// GET /api/reporters/[id] - Get specific reporter (public read-only access)
export const GET = withDataStorage(
  async (
    request: NextRequest,
    dataStorage,
    context: { params: Promise<{ id: string }> }
  ) => {
    const { id: reporterId } = await context.params;

    const reporter = await dataStorage.getReporter(reporterId);
    if (!reporter) {
      return NextResponse.json(
        { error: "Reporter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reporter);
  }
);

// PUT /api/reporters/[id] - Update specific reporter
export const PUT = withAuth(
  async (request: NextRequest, user, dataStorage, context) => {
    const { id: reporterId } = await context.params;

    const container = await getContainer();
    const reporterService = await container.getReporterService();

    const body = await request.json();
    const { beats, prompt, enabled } = body;

    if (!Array.isArray(beats) || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Beats must be an array and prompt must be a string" },
        { status: 400 }
      );
    }

    const updatedReporter = await reporterService.updateReporter(reporterId, {
      beats,
      prompt,
      enabled
    });

    if (!updatedReporter) {
      return NextResponse.json(
        { error: "Reporter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...updatedReporter,
      message: "Reporter updated successfully"
    });
  },
  { requiredPermission: "reporter" }
);

// DELETE /api/reporters/[id] - Delete specific reporter
export const DELETE = withAuth(
  async (request: NextRequest, user, dataStorage, context) => {
    const { id: reporterId } = await context.params;

    const container = await getContainer();
    const reporterService = await container.getReporterService();

    const success = await reporterService.deleteReporter(reporterId);
    if (!success) {
      return NextResponse.json(
        { error: "Reporter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Reporter deleted successfully"
    });
  },
  { requiredPermission: "reporter" }
);
