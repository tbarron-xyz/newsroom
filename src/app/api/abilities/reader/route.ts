import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { AbilitiesService } from "../../../services/abilities.service";

// GET /api/abilities/reader - Check if logged in user has Reader permission
export const GET = withAuth(async (request: NextRequest, user, dataStorage) => {
  const abilitiesService = new AbilitiesService();
  const hasReader = abilitiesService.userIsReader(user);
  return NextResponse.json({ hasReader });
});
