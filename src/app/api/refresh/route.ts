import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { AuthService } from "../../services/auth.service";

export const POST = withDataStorage(
  async (request: NextRequest, dataStorage) => {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token is required" },
        { status: 400 }
      );
    }

    const authService = new AuthService(dataStorage);

    // Refresh the access token
    const newTokens = await authService.refreshAccessToken(refreshToken);
    if (!newTokens) {
      return NextResponse.json(
        { message: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Return new tokens
    return NextResponse.json(
      {
        message: "Token refreshed successfully",
        tokens: newTokens
      },
      { status: 200 }
    );
  }
);
