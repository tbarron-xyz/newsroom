The frontend (`/src/app`) features these pages with key functionalities:

- **Home (`/`)**: Landing page with overview of articles, events, and navigation. Includes a polling-based chat widget (`HomepageChat.tsx`) and a scrolling news ticker (`Ticker.tsx`).
- **About (`/about`)**: Project information and background.
- **Account (`/account`)**: User profile management.
- **Ads (`/ads`)**: Advertising dashboard and management.
- **Admin Bluesky Messages (`/admin/bluesky-messages`)**: Admin panel for handling Bluesky social messages.
- **All Generations (`/all`)**: Admin-only aggregated view with tab filtering for articles, editions, daily editions, and events.
- **Articles (`/articles`, `/articles/[id]`)**: Browse/search articles, view individual article details with author links.
- **Daily Edition (`/daily-edition`)**: View the latest published daily edition with front-page headline, articles, topics, per-topic comments, and token counts. Uses `DailyEditionFullView.tsx`.
- **Drafts (`/drafts`)**: Editor-only page listing unpublished drafts (articles, editions, daily editions) with a publish action.
- **Editor (`/editor`)**: Edit editor bio/prompt, view jobs, manual cron triggers (`/api/cron/*`).
- **Editions (`/editions`)**: List published newspaper editions.
- **Events (`/events`)**: List and manage news events.
- **Flow (`/flow`)**: Visual workflow editor.
- **Forum (`/forum`, `/forum/[forumId]`, `/forum/[forumId]/new`, `/forum/[forumId]/act-as`, `/thread/[threadId]`)**: Forum browsing/posting/AI replies.
- **Logs (`/logs`)**: View server logs.
- **Login (`/login`)**: Authentication form.
- **Opinion (`/opinion`, `/opinion/[id]`)**: AI-generated opinion pieces from 4 political/economic personas (US conservative, US liberal, financial globalist, national populist), each with color-coded badges. Individual article detail view with persona badge and linked articles.
- **Pricing (`/pricing`)**: Subscription and pricing plans.
- **Prism (`/prism`)**: Multi-column comparison view displaying news from different political/geographic perspectives using configured perspective pairs.
- **Reporters (`/reporters`)**: List/edit reporters (beats/prompts), toggle active, links to their articles.
- **Research (`/research`, `/research/[id]`)**: Wikipedia research pipeline. List view shows entries with pending/completed/failed status. Detail view shows topic, goal, next-article suggestions (8 types, color-coded), article summaries, findings document, and per-LLM-call token breakdown.
- **Schema Editor (`/schema-editor`)**: Edit Zod schemas.
- **Search (`/search`)**: Article search via `?q=` query param, results from `/api/articles/search`.
- **Users (`/users`)**: User management list.
- **Artifacts (`/artifacts`)**: AI artifacts management.

### Shared Components

- **`/src/app/components/`**: `DailyEditionFullView.tsx` (enriched daily edition display), `SchemaInput.tsx` (Zod schema textarea with link to schema editor), `Navigation.tsx` (nav bar with admin dropdown linking to `/all`, `/drafts`, `/research`).
- **`/src/components/`**: `HomepageChat.tsx` (polling chat widget), `ThinkCanvas.tsx` (radial tree for "think" suggestions), `Ticker.tsx` (scrolling news ticker), `AnimatedBackground.tsx`, `ContentCard.tsx`, `EditionCard.tsx`, `SourceArticleCard.tsx`, `SourceMessageCard.tsx`, `DataTable.tsx`, `CollapsibleSection.tsx`, `ExpandableSection.tsx`, `EmptyState.tsx`, `FormInput.tsx`, `GradientButton.tsx`, `LoadingSpinner.tsx`, `PageContainer.tsx`, `PageHeader.tsx`.
- **`/src/components/assistant-ui/`**: `assistant-modal.tsx` (floating chat button + 400x560px modal), `thread.tsx` (chat thread with 3-message limit), `markdown-text.tsx`.
- **`/src/components/chat/`**: `ChatProvider.tsx` (sets up `@assistant-ui/react` runtime streaming via `POST /api/chat/send`).

### Key Patterns

- **Service Container**: `ServiceContainer` singleton (`/src/app/services/service-container.ts`) with lazy `getInstance()`. Provides `getDataStorageService()`, `getJobQueueService()`, `getKpiService()`, `getAIService()`. Used by workers and API routes.
- **Auth System**: Token-based auth (`accessToken` + `refreshToken` in `localStorage`), auto-restore on mount via `AuthContext`, ability-based permissions (`hasReader`/`hasReporter`/`hasEditor`/`isAdmin`), `POST /api/refresh` endpoint, `NEXT_PUBLIC_AUTH_DISABLED` dev mode flag.
- **Route Wrappers**: `withAuth` and `withDataStorage` HOFs inject auth user and data storage into API route handlers. `withAuth` supports `{ requiredPermission: "editor" }`.
- **Dual Chat System**: A polling-based homepage chat (`HomepageChat.tsx`, `/api/homepage-chat`) and a streaming assistant chat (`assistant-ui` components, `ChatProvider`, `POST /api/chat/send`).
- **Draft/Publish Workflow**: `published: boolean` field on `DailyEdition`. `/drafts` lists unpublished items; publish action calls `POST /api/drafts/daily-editions/[id]/publish`. Live pages only show published items.
- **Think Feature**: Wikipedia-style concept exploration. Calls `/api/think` for 4 directional suggestions (more general, adjacent, consequence, more specific), then a second round generates nested suggestions. Rendered in a radial tree (`ThinkCanvas.tsx`).
- **Research Pipeline**: User submits topic + goal → creates `ResearchEntry` (pending) → BullMQ job → worker fetches Wikipedia, calls LLM for suggestions/summaries/findings, saves incrementally with per-LLM-call token tracking.
- **Opinion System**: 4 political/economic personas with distinct colors. Opinion articles link to source articles via `articleIds`.
- **Prism Comparison**: Configured perspective pairs (e.g., Israeli Centrist vs Palestinian/Arabic). Each column renders a full daily edition via `DailyEditionFullView.tsx`.
- **Ticker**: Cron job generates ticker text (`/api/cron/ticker`), fetched every 60s by `Ticker` component, displayed across the top of navigation.
- **KPI Tracking**: `TOTAL_TEXT_INPUT_TOKENS` and `TOTAL_TEXT_OUTPUT_TOKENS` recorded on every AI call. Exposed via `GET /api/kpi`.