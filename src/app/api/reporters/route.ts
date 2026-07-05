import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../utils/auth";
import { withDataStorage } from "../../utils/data-storage";
import { ServiceContainer } from "../../services/service-container";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

async function checkReporterPermission(
  request: NextRequest
): Promise<{ user: any } | NextResponse> {
  const container = await getContainer();
  const authService = await container.getAuthService();
  const abilitiesService = await container.getAbilitiesService();

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization token required" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const user = await authService.getUserFromToken(token);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  // Check if user has reporter permission
  const hasPermission = abilitiesService.userIsReporter(user);
  if (!hasPermission) {
    return NextResponse.json(
      { error: "Reporter permission required" },
      { status: 403 }
    );
  }

  return { user };
}

// GET /api/reporters - Get all reporters (public read-only access)
export const GET = withDataStorage(async (_request: NextRequest, dataStorage) => {
  const reporters = await dataStorage.getAllReporters();
  return NextResponse.json(reporters);
});

// POST /api/reporters - Create new reporter
export const POST = withAuth(
  async (request: NextRequest, user, dataStorage) => {
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

    const reporter = await reporterService.createReporter({
      beats,
      prompt,
      enabled: enabled ?? true // Default to true if not specified
    });

    return NextResponse.json(
      {
        ...reporter,
        message: "Reporter created successfully"
      },
      { status: 201 }
    );
  },
  { requiredPermission: "reporter" }
);
