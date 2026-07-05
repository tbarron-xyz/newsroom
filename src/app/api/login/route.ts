import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { AuthService } from "../../services/auth.service";
import { loginRequestSchema } from "../../schemas/request-schemas";
import { AbilitiesService } from "../../services/abilities.service";

export const POST = withDataStorage(async (request: NextRequest, dataStorage) => {
  const body = await request.json();

  // Validate request body
  const validationResult = loginRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        message: "Invalid request data",
        errors: validationResult.error.errors
      },
      { status: 400 }
    );
  }

  const { email, password } = validationResult.data;

  const authService = new AuthService(dataStorage);

  // Authenticate user
  const user = await authService.authenticateUser(email, password);
  if (!user) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Generate tokens
  const tokens = authService.generateTokens(user);

  const abilitiesService = new AbilitiesService();

  // Return success response with tokens
  return NextResponse.json(
    {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasReader: abilitiesService.userIsReader(user),
        hasReporter: abilitiesService.userIsReporter(user),
        hasEditor: abilitiesService.userIsEditor(user)
      },
      tokens
    },
    { status: 200 }
  );
});
