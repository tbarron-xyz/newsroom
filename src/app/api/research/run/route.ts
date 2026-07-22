import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { ServiceContainer } from "../../../services/service-container";
import { ResearchEntry } from "../../../schemas/types";

let container: ServiceContainer | null = null;

async function getContainer(): Promise<ServiceContainer> {
  if (!container) {
    container = ServiceContainer.getInstance();
  }
  return container;
}

export const POST = withAuth(
  async (request: NextRequest, _user, dataStorage) => {
    try {
      const { topic, goal } = await request.json();
      if (!topic || !goal) {
        return NextResponse.json(
          { error: "topic and goal are required" },
          { status: 400 }
        );
      }

      const researchId = await dataStorage.generateId("research");
      const now = Date.now();

      const entry: ResearchEntry = {
        id: researchId,
        topic,
        goal,
        suggestions: [],
        summaries: [],
        findingsDocument: "",
        generationTime: now,
        status: "pending",
        modelName: ""
      };

      await dataStorage.saveResearchEntry(entry);

      const container = await getContainer();
      const jobQueueService = await container.getJobQueueService();
      await jobQueueService.addJob("research", { researchId });

      return NextResponse.json({ researchId });
    } catch (error) {
      console.error("Error starting research pipeline:", error);
      return NextResponse.json(
        { error: "Failed to start research pipeline" },
        { status: 500 }
      );
    }
  }
);
