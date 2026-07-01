export type Persona =
  | "crypto_zealot"
  | "loafy"
  | "awoken"
  | "american_business"
  | "european_business"
  | "silicon_sage"
  | "geo_hawk"
  | "space_visionary"
  | "ai_doomsayer";

export enum AIModelOption {
  GENERAL = "modelName",
  ARTICLE_GENERATION = "articleModelName",
  EVENT_GENERATION = "eventModelName",
  STORY_SELECTION = "storySelectionModelName",
  EDITION_SELECTION = "editionSelectionModelName"
}

export interface Editor {
  bio: string;
  prompt: string;
  modelName: string; // Legacy field for backward compatibility
  articleModelName: string;
  eventModelName: string;
  storySelectionModelName: string;
  editionSelectionModelName: string;
  messageSliceCount: number;
  inputTokenCost: number;
  outputTokenCost: number;
  baseUrl?: string; // Optional base URL for OpenAI API requests
  articleGenerationPeriodMinutes: number;
  lastArticleGenerationTime?: number; // milliseconds since epoch, optional for backward compatibility
  eventGenerationPeriodMinutes: number;
  lastEventGenerationTime?: number; // milliseconds since epoch, optional for backward compatibility
  editionGenerationPeriodMinutes: number;
  lastEditionGenerationTime?: number; // milliseconds since epoch, optional for backward compatibility
}

export interface Reporter {
  id: string;
  beats: string[];
  prompt: string;
  enabled: boolean;
}

export interface ArticleGenerationMetadata {
  id: string;
  reporterId: string;
  generationTime: number;
  wordCount: number;
  modelName: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export interface EventGenerationMetadata {
  modelName: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export interface Article {
  id: string;
  reporterId: string;
  headline: string;
  body: string;
  generationTime: number; // milliseconds since epoch
  prompt: string; // The full prompt used to generate this article
  messageIds: number[]; // Indices of social media messages used
  messageTexts: string[]; // Text content of the messages that were used
  messageDids: string[]; // Bluesky user DIDs for source messages
  messageRkeys: string[]; // Bluesky record keys for source messages
  modelName: string; // The AI model used to generate this article
  inputTokenCount?: number; // Number of input tokens used in the API call
  outputTokenCount?: number; // Number of output tokens used in the API call
}

export interface NewspaperEdition {
  id: string;
  stories: string[]; // article IDs
  generationTime: number; // milliseconds since epoch
  prompt: string; // The full prompt used to generate this edition
  modelName: string; // The AI model used to generate this edition
  inputTokenCount?: number; // Number of input tokens used in the API call
  outputTokenCount?: number; // Number of output tokens used in the API call
}

export interface DailyEditionComment {
  author: string;
  content: string;
  createdAt: number;
  persona: string;
}

export interface DailyEdition {
  id: string;
  editions: string[]; // edition IDs
  generationTime: number; // milliseconds since epoch
  // New detailed content from AI service
  frontPageHeadline: string;
  frontPageArticle: string;
  topics: Array<{
    name: string;
    headline: string;
    newsStoryFirstParagraph: string;
    newsStorySecondParagraph: string;
    oneLineSummary: string;
    comments?: DailyEditionComment[];
  }>;
  // modelFeedbackAboutThePrompt?: {
  //   positive: string;
  //   negative: string;
  // };
  newspaperName?: string;
  prompt: string; // The full prompt used to generate this daily edition
  modelName: string; // The AI model used to generate this daily edition
  inputTokenCount?: number; // Number of input tokens used in the API call
  outputTokenCount?: number; // Number of output tokens used in the API call
}

export interface Event {
  id: string;
  reporterId: string;
  title: string;
  createdTime: number; // milliseconds since epoch
  updatedTime: number; // milliseconds since epoch
  facts: string[]; // JSON list of strings
  where?: string; // Where the event took place
  when?: string; // Date and time the event took place
  messageIds?: number[]; // Indices of social media messages used
  messageTexts?: string[]; // Text content of the messages that were used
  modelName: string; // The AI model used to generate this event
  inputTokenCount?: number; // Number of input tokens used in the API call
  outputTokenCount?: number; // Number of output tokens used in the API call
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "editor" | "reporter" | "user";
  createdAt: number;
  lastLoginAt?: number;
  hasReader: boolean;
  hasReporter: boolean;
  hasEditor: boolean;
}

// KPI Names enum
export enum KpiName {
  TOTAL_AI_API_SPEND = "Total AI API spend",
  TOTAL_TEXT_INPUT_TOKENS = "Total text input tokens",
  TOTAL_TEXT_OUTPUT_TOKENS = "Total text output tokens"
}

// Redis key patterns
export const REDIS_KEYS = {
  // AI Service
  MODEL_NAME: "ai:model_name",

  // Editor
  EDITOR_BIO: "editor:bio",
  EDITOR_PROMPT: "editor:prompt",
  EDITOR_ARTICLE_MODEL_NAME: "editor:article_model_name",
  EDITOR_EVENT_MODEL_NAME: "editor:event_model_name",
  EDITOR_STORY_SELECTION_MODEL_NAME: "editor:story_selection_model_name",
  EDITOR_EDITION_SELECTION_MODEL_NAME: "editor:edition_selection_model_name",
  EDITOR_MESSAGE_SLICE_COUNT: "editor:message_slice_count",
  INPUT_TOKEN_COST: "editor:input_token_cost",
  OUTPUT_TOKEN_COST: "editor:output_token_cost",
  BASE_URL: "editor:base_url",
  ARTICLE_GENERATION_PERIOD_MINUTES: "article_generation:period_minutes",
  LAST_ARTICLE_GENERATION_TIME: "article_generation:last_time",
  EVENT_GENERATION_PERIOD_MINUTES: "event_generation:period_minutes",
  LAST_EVENT_GENERATION_TIME: "event_generation:last_time",
  EDITION_GENERATION_PERIOD_MINUTES: "edition_generation:period_minutes",
  LAST_EDITION_GENERATION_TIME: "edition_generation:last_time",

  // Reporters
  REPORTERS: "reporters",
  REPORTER_BEATS: (id: string) => `reporter:${id}:beats`,
  REPORTER_PROMPT: (id: string) => `reporter:${id}:prompt`,
  REPORTER_ENABLED: (id: string) => `reporter:${id}:enabled`,

  // Articles
  ARTICLES_BY_REPORTER: (reporterId: string) => `articles:${reporterId}`,
  ARTICLES_LATEST: "articles:latest",
  ARTICLES_LATEST_MAX_LENGTH: 100,
  ARTICLE_HEADLINE: (articleId: string) => `article:${articleId}:headline`,
  ARTICLE_BODY: (articleId: string) => `article:${articleId}:body`,
  ARTICLE_TIME: (articleId: string) => `article:${articleId}:time`,
  ARTICLE_PROMPT: (articleId: string) => `article:${articleId}:prompt`,
  ARTICLE_MESSAGE_IDS: (articleId: string) =>
    `article:${articleId}:message_ids`,
  ARTICLE_MESSAGE_TEXTS: (articleId: string) =>
    `article:${articleId}:message_texts`,
  ARTICLE_MESSAGE_DIDS: (articleId: string) =>
    `article:${articleId}:message_dids`,
  ARTICLE_MESSAGE_RKEYS: (articleId: string) =>
    `article:${articleId}:message_rkeys`,
  ARTICLE_MODEL_NAME: (articleId: string) => `article:${articleId}:model_name`,
  ARTICLE_INPUT_TOKEN_COUNT: (articleId: string) =>
    `article:${articleId}:input_token_count`,
  ARTICLE_OUTPUT_TOKEN_COUNT: (articleId: string) =>
    `article:${articleId}:output_token_count`,
  ARTICLE_REPORTER: (articleId: string) => `article:${articleId}:reporter_id`,

  // Newspaper Editions
  EDITIONS: "editions",
  EDITIONS_LATEST: "editions:latest",
  EDITIONS_LATEST_MAX_LENGTH: 25,
  EDITION_STORIES: (editionId: string) => `edition:${editionId}:stories`,
  EDITION_TIME: (editionId: string) => `edition:${editionId}:time`,
  EDITION_PROMPT: (editionId: string) => `edition:${editionId}:prompt`,
  EDITION_MODEL_NAME: (editionId: string) => `edition:${editionId}:model_name`,
  EDITION_INPUT_TOKEN_COUNT: (editionId: string) =>
    `edition:${editionId}:input_token_count`,
  EDITION_OUTPUT_TOKEN_COUNT: (editionId: string) =>
    `edition:${editionId}:output_token_count`,

  // Daily Editions
  DAILY_EDITIONS: "daily_editions",
  DAILY_EDITION_EDITIONS: (dailyEditionId: string) =>
    `daily_edition:${dailyEditionId}:editions`,
  DAILY_EDITION_TIME: (dailyEditionId: string) =>
    `daily_edition:${dailyEditionId}:time`,
  DAILY_EDITION_PROMPT: (dailyEditionId: string) =>
    `daily_edition:${dailyEditionId}:prompt`,
  DAILY_EDITION_MODEL_NAME: (dailyEditionId: string) =>
    `daily_edition:${dailyEditionId}:model_name`,
  DAILY_EDITION_INPUT_TOKEN_COUNT: (dailyEditionId: string) =>
    `daily_edition:${dailyEditionId}:input_token_count`,
  DAILY_EDITION_OUTPUT_TOKEN_COUNT: (dailyEditionId: string) =>
    `daily_edition:${dailyEditionId}:output_token_count`,

  // Events
  EVENTS_BY_REPORTER: (reporterId: string) => `events:${reporterId}`,
  EVENTS_LATEST: "events:latest",
  EVENT_TITLE: (eventId: string) => `event:${eventId}:title`,
  EVENT_CREATED_TIME: (eventId: string) => `event:${eventId}:created_time`,
  EVENT_UPDATED_TIME: (eventId: string) => `event:${eventId}:updated_time`,
  EVENT_FACTS: (eventId: string) => `event:${eventId}:facts`,
  EVENT_WHERE: (eventId: string) => `event:${eventId}:where`,
  EVENT_WHEN: (eventId: string) => `event:${eventId}:when`,
  EVENT_MESSAGE_IDS: (eventId: string) => `event:${eventId}:message_ids`,
  EVENT_MESSAGE_TEXTS: (eventId: string) => `event:${eventId}:message_texts`,
  EVENT_MODEL_NAME: (eventId: string) => `event:${eventId}:model_name`,
  EVENT_INPUT_TOKEN_COUNT: (eventId: string) =>
    `event:${eventId}:input_token_count`,
  EVENT_OUTPUT_TOKEN_COUNT: (eventId: string) =>
    `event:${eventId}:output_token_count`,
  EVENT_REPORTER: (eventId: string) => `event:${eventId}:reporter_id`,

  // Users
  USERS: "users",
  USER_EMAIL: (userId: string) => `user:${userId}:email`,
  USER_PASSWORD_HASH: (userId: string) => `user:${userId}:password_hash`,
  USER_ROLE: (userId: string) => `user:${userId}:role`,
  USER_CREATED_AT: (userId: string) => `user:${userId}:created_at`,
  USER_LAST_LOGIN_AT: (userId: string) => `user:${userId}:last_login_at`,
  USER_HAS_READER: (userId: string) => `user:${userId}:has_reader`,
  USER_HAS_REPORTER: (userId: string) => `user:${userId}:has_reporter`,
  USER_HAS_EDITOR: (userId: string) => `user:${userId}:has_editor`,
  USER_BY_EMAIL: (email: string) => `user_by_email:${email}`,

  // KPIs
  KPI_VALUE: (name: string) => `kpi:${name}:value`,
  KPI_LAST_UPDATED: (name: string) => `kpi:${name}:last_updated`,

  // Jobs
  JOB_RUNNING: (jobName: string) => `job:${jobName}:running`,
  JOB_LAST_RUN: (jobName: string) => `job:${jobName}:last_run`,
  JOB_LAST_SUCCESS: (jobName: string) => `job:${jobName}:last_success`,

  // Forum
  FORUM_SECTIONS: "forum:sections",
  FORUM_THREADS: (forumId: string) => `forum:${forumId}:threads`,
  FORUM_POSTS: (threadId: number) => `forum:thread:${threadId}:posts`,
  FORUM_THREAD: (threadId: number) => `forum:thread:${threadId}`,
  FORUM_POST: (threadId: number, postId: number) =>
    `forum:thread:${threadId}:post:${postId}`,
  FORUM_COUNTER: (forumId: string) => `forum:${forumId}:counter`,
  FORUM_NEXT_THREAD_ID: "forum:next_thread_id",
  FORUM_NEXT_POST_ID: "forum:next_post_id",
  //  // Personas
  PERSONAS_CLASSIC: "personas:classic",
  PERSONAS_DYNAMIC_LATEST: "personas:dynamic:latest",

  // Artifacts
  ARTIFACTS_LATEST: "artifact:latest",
  ARTIFACTS_BY_TYPE: (type: string) => `artifact:${type}`,
  ARTIFACT_TYPE: (artifactId: string) => `artifact:${artifactId}:type`,
  ARTIFACT_INPUTS: (artifactId: string) => `artifact:${artifactId}:inputs`,
  ARTIFACT_PROMPT_SYSTEM: (artifactId: string) =>
    `artifact:${artifactId}:prompt_system`,
  ARTIFACT_PROMPT_USER_TEMPLATE: (artifactId: string) =>
    `artifact:${artifactId}:prompt_user_template`,
  ARTIFACT_OUTPUT: (artifactId: string) => `artifact:${artifactId}:output`,
  ARTIFACT_METADATA: (artifactId: string) => `artifact:${artifactId}:metadata`
} as const;

export interface ForumPost {
  id: number;
  content: string;
  author: string;
  createdAt: number;
}

export interface ForumThread {
  id: number;
  title: string;
  forumId: string;
  author: string;
  createdAt: number;
  replyCount: number;
  lastReplyTime: number;
}

export interface Forum {
  id: string;
  title: string;
  description: string;
  threadCount: number;
  postCount: number;
  latestThread: ForumThread | null;
}

export interface ForumSection {
  id: string;
  title: string;
  forums: Forum[];
}

// Utility types for Redis operations
export interface RedisArticleData {
  id: string;
  headline: string;
  body: string;
  time: number;
}

export interface RedisEditionData {
  id: string;
  stories: string[];
  time: number;
}

export interface RedisDailyEditionData {
  id: string;
  editions: string[];
  time: number;
}

export interface DynamicPersona {
  display: string;
  description: string;
  system_prompt: string;
}

// Artifact types are now free-form strings

export interface ArtifactInput {
  name: string;
  source: "artifacts" | "external";
  type?: string; // for source='artifacts'
  filter?: {
    reporterId?: string;
    limit?: number;
    since?: string; // e.g. '3h', '1d'
    date?: string; // ISO date
  };
}

export interface Artifact {
  id: string;
  type: string;
  inputs: ArtifactInput[];
  prompt_system: string;
  prompt_user_template: string;
  output_schema: string;
  output?: any;
  metadata: {
    model_name?: string;
    input_tokens?: number;
    output_tokens?: number;
    generated_at?: number;
    reporterId?: string;
    status: "pending" | "generated" | "failed";
    error_message?: string;
  };
}

export interface ArtifactJob {
  id: string;
  artifactId: string;
  status: "waiting" | "active" | "completed" | "failed";
  progress?: number;
  result?: any;
  error?: string;
  createdAt?: number;
}

export interface PrismDailyEditionPair {
  id: string;
  generationTime: number;
  leftLabel: string;
  rightLabel: string;
  left: DailyEdition;
  right: DailyEdition;
  sourcePrompt: string;
  leftPrompt: string;
  rightPrompt: string;
}
