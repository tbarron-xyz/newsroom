import { NextRequest, NextResponse } from "next/server";
import { ServiceContainer } from "../../services/service-container";

export const dynamic = "force-dynamic";

export async function GET() {
  const container = ServiceContainer.getInstance();
  const dataStorage = await container.getDataStorageService();
  const messages = await dataStorage.getHomepageChatMessages(50);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const { content } = await request.json();

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length > 500) {
    return NextResponse.json(
      { error: "Message too long (max 500 characters)" },
      { status: 400 }
    );
  }

  const container = ServiceContainer.getInstance();
  const dataStorage = await container.getDataStorageService();
  const aiService = await container.getAIService();

  const recentMessages = await dataStorage.getHomepageChatMessages(10);
  const pastMessages = recentMessages.map(
    (m) =>
      ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
        senderName: m.senderName
      }) as { role: "user" | "assistant"; content: string; senderName: string }
  );

  const hexDigits = Math.floor(Math.random() * 0xfff)
    .toString(16)
    .padStart(3, "0");
  const senderName = `visitor-${hexDigits}`;

  const { isSafe, reply } = await aiService.checkAndReplyToChatMessage(
    trimmedContent,
    senderName,
    pastMessages
  );

  if (!isSafe) {
    return NextResponse.json(
      { error: "Message was removed due to inappropriate content" },
      { status: 400 }
    );
  }

  const now = Date.now();

  const userMessage = {
    id: await dataStorage.generateId("chat"),
    senderName,
    content: trimmedContent,
    timestamp: now,
    type: "user" as const
  };

  await dataStorage.saveHomepageChatMessage(userMessage);

  if (reply) {
    const assistantMessage = {
      id: await dataStorage.generateId("chat"),
      senderName: "chatbot",
      content: reply,
      timestamp: Date.now(),
      type: "assistant" as const
    };
    await dataStorage.saveHomepageChatMessage(assistantMessage);
  }

  const messages = await dataStorage.getHomepageChatMessages(50);

  return NextResponse.json({ messages });
}
