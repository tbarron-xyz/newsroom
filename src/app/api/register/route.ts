import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { AuthService } from "../../services/auth.service";
import { registerRequestSchema } from "../../schemas/request-schemas";
import { AbilitiesService } from "../../services/abilities.service";

export const POST = withDataStorage(async (request: NextRequest, dataStorage) => {
  const body = await request.json();

  // Validate request body
  const validationResult = registerRequestSchema.safeParse(body);
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

  // Register user
  const user = await authService.registerUser(email, password);

  // Generate tokens for immediate login
  const tokens = authService.generateTokens(user);

  const abilitiesService = new AbilitiesService();

  // Return success response
  return NextResponse.json(
    {
      message: "User registered successfully",
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
    { status: 201 }
  );
});
