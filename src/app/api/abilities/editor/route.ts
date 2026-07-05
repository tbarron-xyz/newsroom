import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { AbilitiesService } from "../../../services/abilities.service";

// GET /api/abilities/editor - Check if logged in user has Editor permission
export const GET = withAuth(async (request: NextRequest, user, dataStorage) => {
  const abilitiesService = new AbilitiesService();
  const hasEditor = abilitiesService.userIsEditor(user);
  return NextResponse.json({ hasEditor });
});
