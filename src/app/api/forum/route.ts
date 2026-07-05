import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { ForumSection, ForumThread } from "../../schemas/types";

export const GET = withDataStorage(
  async (_request: NextRequest, dataStorage): Promise<NextResponse> => {
    const sections = await dataStorage.getForumSections();

    if (!sections) {
      return NextResponse.json([]);
    }

    const enrichedSections: ForumSection[] = [];

    for (const section of sections) {
      const enrichedForums = [];

      for (const forum of section.forums) {
        const counters = await dataStorage.getForumCounters(forum.id);
        const threads = await dataStorage.getForumThreads(forum.id, 0, 1);
        const latestThread: ForumThread | null = threads[0] || null;

        enrichedForums.push({
          ...forum,
          threadCount: counters.threadCount,
          postCount: counters.postCount,
          latestThread
        });
      }

      enrichedSections.push({
        ...section,
        forums: enrichedForums
      });
    }

    return NextResponse.json(enrichedSections);
  }
);
