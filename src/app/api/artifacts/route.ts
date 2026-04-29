import { NextResponse } from "next/server";
import { withAuth } from "../../utils/auth";
import { ServiceContainer } from "../../services/service-container";

// GET /api/artifacts - Get all artifacts
export async function GET() {
  const dataStorage =
    await ServiceContainer.getInstance().getDataStorageService();
  const artifacts = await dataStorage.getAllArtifacts();
  return NextResponse.json(artifacts);
}

// POST /api/artifacts - Create new artifact
export const POST = withAuth(
  async (request: Request, user) => {
    const body = await request.json();
    const {
      type,
      inputs,
      prompt_system,
      prompt_user_template,
      output_schema,
      metadata
    } = body;

    if (
      !type ||
      !inputs ||
      !prompt_system ||
      !prompt_user_template ||
      !output_schema
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const artifact = {
      id,
      type,
      inputs: inputs.map((input: any) => ({
        name: input.name,
        source: input.source,
        type: input.type,
        filter: input.filter
      })),
      prompt_system,
      prompt_user_template,
      output_schema,
      metadata: { status: "pending" as const, ...(metadata || {}) }
    };

    const dataStorage =
      await ServiceContainer.getInstance().getDataStorageService();
    await dataStorage.saveArtifact(artifact);
    return NextResponse.json(artifact, { status: 201 });
  },
  { requiredRole: "admin" }
);
