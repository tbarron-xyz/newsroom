import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../utils/auth";

const VALID_TYPES = [
  "articles",
  "editions",
  "daily-editions",
  "events"
] as const;
type AllType = (typeof VALID_TYPES)[number];

export const GET = withAuth(
  async (request: NextRequest, _user, dataStorage) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as AllType | null;
    const limitParam = searchParams.get("limit");

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type parameter must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    let limit = 500;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: "limit parameter must be a positive integer" },
          { status: 400 }
        );
      }
      limit = parsed;
    }

    try {
      let data: unknown[] = [];

      switch (type) {
        case "articles": {
          data = await dataStorage.getLatestArticles(limit);
          break;
        }
        case "editions": {
          data = await dataStorage.getLatestEditions(limit);
          break;
        }
        case "daily-editions": {
          data = await dataStorage.getDailyEditions(limit);
          break;
        }
        case "events": {
          data = await dataStorage.getLatestUpdatedEvents(limit);
          break;
        }
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      return NextResponse.json(
        { error: `Failed to fetch ${type}` },
        { status: 500 }
      );
    }
  },
  { requiredPermission: "editor" }
);
