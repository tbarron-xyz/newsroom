import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../../utils/data-storage";

export const GET = withDataStorage(
  async (
    request: NextRequest,
    dataStorage,
    { params }: { params: Promise<{ threadId: string }> }
  ): Promise<NextResponse> => {
    const { threadId } = await params;
    const threadIdNum = parseInt(threadId, 10);
    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const thread = await dataStorage.getThread(threadIdNum);
    const posts = await dataStorage.getThreadPosts(threadIdNum, offset, limit);

    return NextResponse.json({
      thread,
      posts
    });
  }
);
