import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../utils/auth";
import { withDataStorage } from "../../utils/data-storage";

// GET /api/editor - Get current editor data
export const GET = withDataStorage(
  async (_request: NextRequest, dataStorage) => {
    const editor = await dataStorage.getEditor();

    return NextResponse.json({
      bio: editor?.bio || "",
      prompt: editor?.prompt || "",
      modelName: editor?.modelName || "gpt-5-nano",
      articleModelName: editor?.articleModelName || "gpt-5-nano",
      eventModelName: editor?.eventModelName || "gpt-5-nano",
      storySelectionModelName: editor?.storySelectionModelName || "gpt-5-nano",
      editionSelectionModelName:
        editor?.editionSelectionModelName || "gpt-5-nano",
      messageSliceCount: editor?.messageSliceCount || 200,
      inputTokenCost: editor?.inputTokenCost || 0.05,
      outputTokenCost: editor?.outputTokenCost || 0.4,
      baseUrl: editor?.baseUrl || "",
      articleGenerationPeriodMinutes:
        editor?.articleGenerationPeriodMinutes || 15,
      lastArticleGenerationTime: editor?.lastArticleGenerationTime || null,
      eventGenerationPeriodMinutes: editor?.eventGenerationPeriodMinutes || 30,
      lastEventGenerationTime: editor?.lastEventGenerationTime || null,
      editionGenerationPeriodMinutes:
        editor?.editionGenerationPeriodMinutes || 180,
      lastEditionGenerationTime: editor?.lastEditionGenerationTime || null
    });
  }
);

// PUT /api/editor - Update editor data
export const PUT = withAuth(
  async (request: NextRequest, user, dataStorage) => {
    const body = await request.json();
    const {
      bio,
      prompt,
      modelName,
      articleModelName,
      eventModelName,
      storySelectionModelName,
      editionSelectionModelName,
      messageSliceCount,
      inputTokenCost,
      outputTokenCost,
      baseUrl,
      articleGenerationPeriodMinutes,
      eventGenerationPeriodMinutes,
      editionGenerationPeriodMinutes
    } = body;

    if (
      typeof bio !== "string" ||
      typeof prompt !== "string" ||
      typeof modelName !== "string" ||
      typeof articleModelName !== "string" ||
      typeof eventModelName !== "string" ||
      typeof storySelectionModelName !== "string" ||
      typeof editionSelectionModelName !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Bio, prompt, modelName, and all model names must be strings"
        },
        { status: 400 }
      );
    }

    if (baseUrl !== undefined && typeof baseUrl !== "string") {
      return NextResponse.json(
        { error: "baseUrl must be a string if provided" },
        { status: 400 }
      );
    }

    if (
      typeof messageSliceCount !== "number" ||
      messageSliceCount < 1 ||
      messageSliceCount > 1000
    ) {
      return NextResponse.json(
        { error: "messageSliceCount must be a number between 1 and 1000" },
        { status: 400 }
      );
    }

    if (
      typeof articleGenerationPeriodMinutes !== "number" ||
      articleGenerationPeriodMinutes < 1 ||
      articleGenerationPeriodMinutes > 1440
    ) {
      return NextResponse.json(
        {
          error:
            "articleGenerationPeriodMinutes must be a number between 1 and 1440"
        },
        { status: 400 }
      );
    }

    if (
      typeof eventGenerationPeriodMinutes !== "number" ||
      eventGenerationPeriodMinutes < 1 ||
      eventGenerationPeriodMinutes > 1440
    ) {
      return NextResponse.json(
        {
          error:
            "eventGenerationPeriodMinutes must be a number between 1 and 1440"
        },
        { status: 400 }
      );
    }

    if (
      typeof editionGenerationPeriodMinutes !== "number" ||
      editionGenerationPeriodMinutes < 1 ||
      editionGenerationPeriodMinutes > 1440
    ) {
      return NextResponse.json(
        {
          error:
            "editionGenerationPeriodMinutes must be a number between 1 and 1440"
        },
        { status: 400 }
      );
    }

    if (typeof inputTokenCost !== "number" || inputTokenCost < 0) {
      return NextResponse.json(
        { error: "inputTokenCost must be a non-negative number" },
        { status: 400 }
      );
    }

    if (typeof outputTokenCost !== "number" || outputTokenCost < 0) {
      return NextResponse.json(
        { error: "outputTokenCost must be a non-negative number" },
        { status: 400 }
      );
    }

    await dataStorage.saveEditor({
      bio,
      prompt,
      modelName,
      articleModelName,
      eventModelName,
      storySelectionModelName,
      editionSelectionModelName,
      messageSliceCount,
      inputTokenCost,
      outputTokenCost,
      baseUrl: baseUrl || undefined,
      articleGenerationPeriodMinutes,
      eventGenerationPeriodMinutes,
      editionGenerationPeriodMinutes
    });

    return NextResponse.json({
      bio,
      prompt,
      modelName,
      articleModelName,
      eventModelName,
      storySelectionModelName,
      editionSelectionModelName,
      messageSliceCount,
      inputTokenCost,
      outputTokenCost,
      baseUrl: baseUrl || "",
      articleGenerationPeriodMinutes,
      eventGenerationPeriodMinutes,
      editionGenerationPeriodMinutes,
      message: "Editor data updated successfully"
    });
  },
  { requiredRole: "admin" }
);
