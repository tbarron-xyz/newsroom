import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { AbilitiesService } from "../../../services/abilities.service";

// GET /api/abilities/reporter - Check if logged in user has Reporter permission
export const GET = withAuth(async (request: NextRequest, user, dataStorage) => {
  const abilitiesService = new AbilitiesService();
  const hasReporter = abilitiesService.userIsReporter(user);
  return NextResponse.json({ hasReporter });
});
