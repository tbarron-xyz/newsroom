import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { ServiceContainer } from "../../services/service-container";
import { PERSPECTIVE_PAIRS } from "../../services/perspectives";

export const POST = withDataStorage(
  async (request: NextRequest, dataStorage) => {
    try {
      const body = await request.json();
      const { dailyEditionId, pairId } = body;

      if (!pairId || typeof pairId !== "string") {
        return NextResponse.json(
          { error: "pairId is required and must be a string" },
          { status: 400 }
        );
      }

      const pair = PERSPECTIVE_PAIRS.find((p) => p.id === pairId);
      if (!pair) {
        return NextResponse.json(
          { error: `Unknown pairId: ${pairId}` },
          { status: 400 }
        );
      }

      let dailyEdition;
      if (dailyEditionId) {
        dailyEdition = await dataStorage.getDailyEdition(dailyEditionId);
      } else {
        const editions = await dataStorage.getDailyEditions(1);
        dailyEdition = editions[0] || null;
      }

      if (!dailyEdition) {
        return NextResponse.json(
          { error: "No daily edition found" },
          { status: 404 }
        );
      }

      const container = ServiceContainer.getInstance();
      const aiService = await container.getAIService();

      const [leftResult, rightResult] = await Promise.all([
        aiService.remapDailyEdition(dailyEdition, pair.left.prompt),
        aiService.remapDailyEdition(dailyEdition, pair.right.prompt)
      ]);

      return NextResponse.json({
        left: {
          label: pair.left.label,
          content: leftResult.content
        },
        right: {
          label: pair.right.label,
          content: rightResult.content
        }
      });
    } catch (error) {
      console.error("Error in prism remap:", error);
      return NextResponse.json(
        { error: "Failed to remap daily edition" },
        { status: 500 }
      );
    }
  }
);
