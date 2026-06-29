import { NextRequest, NextResponse } from "next/server";
import { User } from "../schemas/types";
import { IDataStorageService } from "../services/data-storage.interface";
import { AuthService } from "../services/auth.service";
import { AbilitiesService } from "../services/abilities.service";
import { ServiceContainer } from "../services/service-container";

type PermissionType = "reader" | "reporter" | "editor";

interface WithAuthOptions {
  requiredRole?: "admin";
  requiredPermission?: PermissionType;
}

export function withAuth(
  handler: (
    request: NextRequest,
    user: User,
    dataStorage: IDataStorageService,
    context?: any
  ) => Promise<NextResponse>,
  options: WithAuthOptions = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const container = ServiceContainer.getInstance();
    const dataStorage = await container.getDataStorageService();

    if (process.env.AUTH_DISABLED === "true") {
      const syntheticUser: User = {
        id: "auth-disabled-user",
        email: "dev@localhost",
        passwordHash: "",
        role: "admin",
        createdAt: Date.now(),
        hasReader: true,
        hasReporter: true,
        hasEditor: true,
      };
      return handler(request, syntheticUser, dataStorage, context);
    }

    const authService = await container.getAuthService();
    const abilitiesService = await container.getAbilitiesService();

    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Authorization token required" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      const user = await authService.getUserFromToken(token);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }

      // Check role
      if (options.requiredRole) {
        if (user.role !== options.requiredRole) {
          return NextResponse.json(
            { error: `${options.requiredRole} access required` },
            { status: 403 }
          );
        }
      }

      // Check permission
      if (options.requiredPermission) {
        let hasPermission = false;
        switch (options.requiredPermission) {
          case "reader":
            hasPermission = abilitiesService.userIsReader(user);
            break;
          case "reporter":
            hasPermission = abilitiesService.userIsReporter(user);
            break;
          case "editor":
            hasPermission = abilitiesService.userIsEditor(user);
            break;
        }
        if (!hasPermission) {
          return NextResponse.json(
            { error: `${options.requiredPermission} permission required` },
            { status: 403 }
          );
        }
      }

      return await handler(request, user, dataStorage, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
