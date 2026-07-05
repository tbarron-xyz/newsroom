import { NextRequest, NextResponse } from "next/server";
import { IDataStorageService } from "../services/data-storage.interface";
import { ServiceContainer } from "../services/service-container";

export function withDataStorage(
  handler: (
    request: NextRequest,
    dataStorage: IDataStorageService,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const container = ServiceContainer.getInstance();
    const dataStorage = await container.getDataStorageService();

    try {
      return await handler(request, dataStorage, context);
    } catch (error) {
      console.error("Data storage wrapper error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
