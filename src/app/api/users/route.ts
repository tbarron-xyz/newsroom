import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../utils/auth";

// GET /api/users - Get all users (admin only)
export const GET = withAuth(
  async (request: NextRequest, user, dataStorage) => {
    // Get all users
    const users = await dataStorage.getAllUsers();

    // Return users without password hashes
    const safeUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));

    return NextResponse.json(safeUsers);
  },
  { requiredRole: "admin" }
);
