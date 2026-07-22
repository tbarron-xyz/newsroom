import type {
  Article,
  Editor,
  Event,
  Reporter,
  User,
  NewspaperEdition,
  DailyEdition,
  Ticker,
  OpinionArticle,
  OpinionPersona
} from "../schemas/types";

export function makeEditor(overrides: Partial<Editor> = {}): Editor {
  const now = Date.now();
  return {
    bio: "Test editor",
    prompt: "You are a test editor",
    modelName: "gpt-4",
    articleModelName: "gpt-4",
    eventModelName: "gpt-4",
    storySelectionModelName: "gpt-4",
    editionSelectionModelName: "gpt-4",
    chatModelName: "gpt-4",
    researchModelName: "gpt-4",
    messageSliceCount: 10,
    baseUrl: "https://api.openai.com/v1",
    articleGenerationPeriodMinutes: 15,
    lastArticleGenerationTime: now,
    eventGenerationPeriodMinutes: 30,
    lastEventGenerationTime: now,
    editionGenerationPeriodMinutes: 180,
    lastEditionGenerationTime: now,
    ...overrides
  };
}

export function makeReporter(overrides: Partial<Reporter> = {}): Reporter {
  return {
    id: "reporter_test_1",
    beats: ["politics", "tech"],
    prompt: "You are a test reporter",
    enabled: true,
    ...overrides
  };
}

export function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "article_test_1",
    reporterId: "reporter_test_1",
    headline: "Test Article",
    body: "This is a test article body.",
    generationTime: 1000,
    prompt: "Write an article about X",
    messageIds: [1, 2, 3],
    messageTexts: ["msg1", "msg2", "msg3"],
    messageDids: ["did:plc:a", "did:plc:b"],
    messageRkeys: ["rkey1", "rkey2"],
    modelName: "gpt-4",
    ...overrides
  };
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event_test_1",
    reporterId: "reporter_test_1",
    title: "Test Event",
    createdTime: 1000,
    updatedTime: 2000,
    facts: ["fact one", "fact two"],
    where: "Washington DC",
    when: "2024-01-15",
    messageIds: [1, 2],
    messageTexts: ["source msg 1", "source msg 2"],
    modelName: "gpt-4",
    ...overrides
  };
}

export function makeUserInput(
  overrides: Partial<Omit<User, "id" | "createdAt" | "lastLoginAt">> = {}
): Omit<User, "id" | "createdAt" | "lastLoginAt"> {
  return {
    email: "test@example.com",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
    role: "editor",
    hasReader: true,
    hasReporter: false,
    hasEditor: true,
    ...overrides
  };
}

export function makeNewspaperEdition(
  overrides: Partial<NewspaperEdition> = {}
): NewspaperEdition {
  return {
    id: "edition_test_1",
    stories: ["article_1", "article_2"],
    generationTime: 3000,
    prompt: "Curate an edition",
    modelName: "gpt-4",
    ...overrides
  };
}

export function makeDailyEdition(
  overrides: Partial<DailyEdition> = {}
): DailyEdition {
  return {
    id: "daily_test_1",
    editions: ["edition_1", "edition_2"],
    generationTime: 5000,
    frontPageHeadline: "Daily News",
    frontPageArticle: "Top story of the day.",
    newspaperName: "Test Times",
    topics: [
      {
        name: "Politics",
        headline: "Political Headline",
        newsStoryFirstParagraph: "Para one.",
        newsStorySecondParagraph: "Para two.",
        oneLineSummary: "Political summary."
      }
    ],
    prompt: "Compile a daily edition",
    modelName: "gpt-4",
    ...overrides
  };
}

export function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
  return {
    id: "ticker_test_1",
    text: "Breaking news: test event occurred",
    generationTime: Date.now(),
    dailyEditionId: "daily_test_1",
    modelName: "gpt-4",
    ...overrides
  };
}

export function makeOpinionArticle(
  overrides: Partial<OpinionArticle> = {}
): OpinionArticle {
  return {
    id: "opinion_test_1",
    persona: "US liberal" as OpinionPersona,
    headline: "A Liberal Perspective on Test Events",
    content: "This is the opinion article content.",
    generationTime: Date.now(),
    articleIds: ["article_1"],
    modelName: "gpt-4",
    ...overrides
  };
}
