import { NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { ServiceContainer } from "../../../services/service-container";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing artifact ID" }, { status: 400 });
  }

  try {
    const dataStorage =
      await ServiceContainer.getInstance().getDataStorageService();
    const artifact = await dataStorage.getArtifact(id);
    if (!artifact) {
      return NextResponse.json(
        { error: "Artifact not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(artifact);
  } catch (error) {
    console.error("Error fetching artifact:", error);
    return NextResponse.json(
      { error: "Failed to fetch artifact" },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(
  async (request, user, dataStorage, context) => {
    const params = await (context as { params: Promise<{ id: string }> })
      .params;
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing artifact ID" },
        { status: 400 }
      );
    }

    try {
      const body = await request.json();
      await dataStorage.updateArtifact(id, body);
      const updated = await dataStorage.getArtifact(id);
      return NextResponse.json(updated);
    } catch (error) {
      console.error("Error updating artifact:", error);
      return NextResponse.json(
        { error: "Failed to update artifact" },
        { status: 500 }
      );
    }
  },
  { requiredRole: "admin" }
);

export const DELETE = withAuth(
  async (request, user, dataStorage, context) => {
    const params = await (context as { params: Promise<{ id: string }> })
      .params;
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing artifact ID" },
        { status: 400 }
      );
    }

    try {
      await dataStorage.deleteArtifact(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting artifact:", error);
      return NextResponse.json(
        { error: "Failed to delete artifact" },
        { status: 500 }
      );
    }
  },
  { requiredRole: "admin" }
);
