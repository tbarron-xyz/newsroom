import { NextRequest, NextResponse } from "next/server";
import { AIClient } from "../../../services/ai-client";
import { AIModelOption } from "../../../schemas/types";
import { RedisDataStorageService } from "../../../services/redis-data-storage.service";

export async function POST(request: NextRequest) {
  const { messages, sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const dataStorage = new RedisDataStorageService();
  await dataStorage.connect();

  const editor = await dataStorage.getEditor();
  if (!editor) {
    await dataStorage.disconnect();
    return NextResponse.json(
      { error: "Editor configuration not found" },
      { status: 500 }
    );
  }

  const [pairs] = await Promise.all([dataStorage.getPrismDailyEditionPairs(1)]);

  let editionContext: string;
  if (pairs && pairs.length > 0) {
    const pair = pairs[0];
    const left = pair.left;
    const right = pair.right;
    editionContext = `Today's Prism Edition: ${pair.leftLabel} vs ${pair.rightLabel}

--- ${pair.leftLabel} ---
Headline: ${left.frontPageHeadline}
Front Page: ${left.frontPageArticle}

Topics:
${left.topics
  .map(
    (t, i) => `  ${i + 1}. ${t.name}: ${t.headline} — ${t.oneLineSummary}
     ${t.newsStoryFirstParagraph}
     ${t.newsStorySecondParagraph}`
  )
  .join("\n")}

--- ${pair.rightLabel} ---
Headline: ${right.frontPageHeadline}
Front Page: ${right.frontPageArticle}

Topics:
${right.topics
  .map(
    (t, i) => `  ${i + 1}. ${t.name}: ${t.headline} — ${t.oneLineSummary}
     ${t.newsStoryFirstParagraph}
     ${t.newsStorySecondParagraph}`
  )
  .join("\n")}`;
  } else {
    const [dailyEditions] = await Promise.all([
      dataStorage.getDailyEditions(1)
    ]);
    const edition =
      dailyEditions && dailyEditions.length > 0 ? dailyEditions[0] : null;
    if (!edition) {
      await dataStorage.disconnect();
      return NextResponse.json(
        { error: "No daily edition available" },
        { status: 404 }
      );
    }
    editionContext = `Today's Daily Edition
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
  }

  const existingSession = await dataStorage.getChatSession(sessionId);
  const userMessages =
    existingSession !== null
      ? existingSession.filter((m: any) => m.role === "user")
      : [];
  if (userMessages.length >= 3) {
    await dataStorage.disconnect();
    return NextResponse.json({ error: "conversation_ended" }, { status: 403 });
  }

  const systemPrompt = `You are a helpful news assistant answering questions about today's Daily Prism Edition.
Answer concisely using only the content provided below. If the answer is not in the edition,
say you don't have that information.

TODAY'S EDITION:
${editionContext}`;

  const previousMessages = existingSession
    ? existingSession.map((m: any) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content.map((c: any) => c.text || "").join("")
      }))
    : [];

  const latestUserMessage = messages[messages.length - 1];
  const latestContent =
    typeof latestUserMessage.content === "string"
      ? latestUserMessage.content
      : latestUserMessage.content.map((c: any) => c.text || "").join("");

  const aiClient = new AIClient(dataStorage);

  const stream = await aiClient.createChatCompletionStream(AIModelOption.CHAT, {
    messages: [
      { role: "system", content: systemPrompt },
      ...previousMessages,
      { role: "user", content: latestContent }
    ]
  });

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullResponse += delta;
            controller.enqueue(encoder.encode(delta));
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
              content: [{ type: "text", text: latestContent }]
            },
            assistantMessage
          ]
        : [
            {
              role: "user",
              content: [{ type: "text", text: latestContent }]
            },
            assistantMessage
          ];

      await dataStorage.saveChatSession(sessionId, updatedMessages);
      await dataStorage.disconnect();
    }
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache"
    }
  });
}
