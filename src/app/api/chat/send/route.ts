import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ServiceContainer } from "../../../services/service-container";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { content, sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const container = ServiceContainer.getInstance();
  const dataStorage = await container.getDataStorageService();

  const editor = await dataStorage.getEditor();
  if (!editor) {
    return NextResponse.json(
      { error: "Editor configuration not found" },
      { status: 500 }
    );
  }

  const [dailyEditions] = await Promise.all([dataStorage.getDailyEditions(1)]);
  const edition =
    dailyEditions && dailyEditions.length > 0 ? dailyEditions[0] : null;
  if (!edition) {
    return NextResponse.json(
      { error: "No daily edition available" },
      { status: 404 }
    );
  }

  const editionContext = `Today's Daily Edition
Headline: ${edition.frontPageHeadline}
Front Page: ${edition.frontPageArticle}

Topics:
${edition.topics
  .map(
    (t, i) => `  ${i + 1}. ${t.name}: ${t.headline} — ${t.oneLineSummary}
     ${t.newsStoryFirstParagraph}
     ${t.newsStorySecondParagraph}`
  )
  .join("\n")}`;

  const existingSession = await dataStorage.getChatSession(sessionId);
  const userMessages =
    existingSession !== null
      ? existingSession.filter((m: any) => m.role === "user")
      : [];
  if (userMessages.length >= 3) {
    return NextResponse.json({ error: "conversation_ended" }, { status: 403 });
  }

  const systemPrompt = `You are a helpful news assistant answering questions about today's Daily Edition.
Answer concisely using only the content provided below. If the answer is not in the edition,
say you don't have that information.

TODAY'S EDITION:
${editionContext}`;

  const previousMessages = existingSession
    ? existingSession.map((m: any) => ({
        role: m.role,
        content: m.content.map((c: any) => c.text || "").join("")
      }))
    : [];

  const modelName = editor.chatModelName;
  if (!modelName) {
    return NextResponse.json(
      { error: "Chat model not configured" },
      { status: 500 }
    );
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: editor.baseUrl || undefined
  });

  const result = streamText({
    model: openai.chat(modelName),
    system: systemPrompt,
    messages: [...previousMessages, { role: "user", content }]
  });

  const encoder = new TextEncoder();
  let fullResponse = "";
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          if (chunk.type === "text-delta") {
            fullResponse += chunk.text;
            controller.enqueue(encoder.encode(chunk.text));
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }

      const assistantMessage = {
        role: "assistant",
        content: [{ type: "text", text: fullResponse }]
      };

      const updatedMessages = existingSession
        ? [
            ...existingSession,
            {
              role: "user",
              content: [{ type: "text", text: content }]
            },
            assistantMessage
          ]
        : [
            {
              role: "user",
              content: [{ type: "text", text: content }]
            },
            assistantMessage
          ];

      await dataStorage.saveChatSession(sessionId, updatedMessages);
    }
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache"
    }
  });
}
