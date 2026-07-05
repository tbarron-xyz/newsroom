import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../utils/auth";
import { fetchLatestMessages } from "../../../services/bluesky.service";

// GET /api/admin/bluesky-messages - Get Bluesky messages (admin only)
export const GET = withAuth(
  async (request: NextRequest, user, dataStorage) => {
    // Get message count from editor settings
    let messageCount = 50; // Default fallback
    try {
      const editor = await dataStorage.getEditor();
      if (editor) {
        messageCount = editor.messageSliceCount;
      }
    } catch (error) {
      console.warn(
        "Failed to fetch message count from editor settings, using default:",
        error
      );
    }

    // Fetch messages using utility function
    const messages = await fetchLatestMessages(messageCount);

    return NextResponse.json({
      messages,
      count: messages.length,
      timestamp: Date.now()
    });
  },
  { requiredRole: "admin" }
);
