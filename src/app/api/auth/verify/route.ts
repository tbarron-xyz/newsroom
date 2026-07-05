import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { AbilitiesService } from "../../../services/abilities.service";

// GET /api/auth/verify - Verify token and return user info
export const GET = withAuth(async (request: NextRequest, user, dataStorage) => {
  const abilitiesService = new AbilitiesService();

  // Check user abilities
  const hasReader = abilitiesService.userIsReader(user);
  const hasReporter = abilitiesService.userIsReporter(user);
  const hasEditor = abilitiesService.userIsEditor(user);

  // Return user info without password hash
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      hasReader,
      hasReporter,
      hasEditor
    }
  });
});
