import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";

export const GET = withAuth(
  async (_request: NextRequest, _user, dataStorage) => {
    const dailyEditions = await dataStorage.getDailyEditions();
    return NextResponse.json(dailyEditions);
  },
  { requiredPermission: "editor" }
);
