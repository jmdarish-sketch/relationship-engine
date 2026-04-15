@AGENTS.md

# Relationship Engine — Project Overview

## Product

AI-powered relationship intelligence platform. Professionals wear an **Omi** device that captures natural conversations; transcripts are piped through Claude to extract structured facts about the people they talk to, resolve speaker identity against an existing contact book, and generate on-demand prep briefs, outreach suggestions, and relationship summaries.

Tagline: *"Never forget a conversation again. Turn your relationships into your competitive advantage."*

## Tech Stack

- **Next.js 16.2.3** (App Router) + **React 19** + **TypeScript 5**
- **Prisma 7.7** with **Neon serverless PostgreSQL** adapter (`@neondatabase/serverless`)
- **Anthropic SDK** (`@anthropic-ai/sdk ^0.87.0`) — Haiku 4.5 (`claude-haiku-4-5-20251001`) for fast tasks, Sonnet 4 (`claude-sonnet-4-20250514`) for extraction/insights
- **Auth:** JWT via `jose` (15-min access, 7-day refresh) in httpOnly cookies, `bcryptjs` (12 rounds)
- **TanStack React Query 5**, **Tailwind CSS 4**, **Zod 4**
- **Vitest 4**, **ESLint 9**, **tsx**

⚠️ Next.js 16 has breaking changes — consult `node_modules/next/dist/docs/` before writing Next-specific code (see AGENTS.md).

## Directory Layout

```
app/                       Next.js App Router
  api/                     All API routes (see below)
  page.tsx                 Marketing landing page
  layout.tsx, providers.tsx  Root layout, auth + React Query providers
  globals.css              Theme CSS variables
  login/, onboarding/, dashboard/, contacts/, contacts/[id]/, review/

lib/
  ai/
    anthropic.ts           Claude client, JSON parsing (parseStructuredResponse<T>)
    prompts.ts             All prompts (relevance, extraction, speaker res, prep, outreach)
    insights.ts            Insight generation
  pipeline/
    processor.ts           4-stage extraction pipeline
    speaker-resolver.ts    3-tier speaker matching (AI + name-fallback)
    queue.ts               Async processing
  omi/                     Omi device client + transcript utils
  api/                     auth.ts, response.ts, fingerprint.ts, person-context.ts
  types/                   database.ts, extraction.ts, api.ts
  auth.ts, auth-helpers.ts JWT + password hashing, cookie helpers
  api-client.ts            Typed fetch wrapper
  prisma.ts                Prisma singleton

prisma/schema.prisma       DB schema
middleware.ts              JWT auth for /api/* (excludes /api/auth, /api/webhook)
components/                Navbar, Skeleton, Toast
hooks/                     useAuth, usePerson, useGenerateInsight, etc.
scripts/                   seed-test-data, wipe-test-data, merge-duplicate-zachs, diagnostics
```

## Database (Prisma)

- **User** — id, email, passwordHash, fullName, profileSummary, onboardingCompleted, `omiWebhookUrl`, `omiApiKey`
- **Person** — contact owned by a User. displayName, firstName/lastName, employer, userCurrentRole, school, email, phone, linkedinUrl, notes, `fingerprint` (JSON arrays of historically seen names/employers/roles/schools for matching)
- **Interaction** — recorded conversation. source (`omi|manual|import`), rawTranscript, processedTranscript, summary, interactionDate, durationSeconds, location, omiSessionId, processingStatus (`pending|processing|completed|failed`)
- **InteractionPerson** — M:M join with confidenceScore + speakerLabel
- **ExtractedDetail** — structured facts: category (`career|education|personal|preference|action_item`), detailKey, detailValue, confidence
- **IdentitySignal** — fine-grained matching signals (signalType, signalValue, confidence) per person+interaction for audit trail
- **Insight** — AI-generated. insightType (`prep_brief|outreach_suggestion|relationship_summary|cross_reference|follow_up`), content, metadata, expiresAt (e.g. prep briefs expire in 24h)
- **DisambiguationQueue** — ambiguous speaker matches. candidatePersonIds (UUID[]), identitySignalsSnapshot, status (`pending|resolved`), resolvedPersonId

## Extraction Pipeline (`lib/pipeline/processor.ts`)

1. **Relevance filter** (Haiku) — reject noise fast
2. **Full extraction** (Sonnet) — structured JSON: speakers, career, education, personal, action items, cross-references. User's `profileSummary` is injected so the model knows who "USER" is.
3. **Speaker resolution** (Haiku, with name/employer fallback if AI fails) — 3-tier confidence:
   - `> 0.8` → auto-link to existing Person
   - `0.3–0.8` → push to DisambiguationQueue for manual review
   - `< 0.3` → create new Person
4. **Storage** — persist Interaction, InteractionPerson, ExtractedDetail, IdentitySignal

## API Routes

**Auth:** `POST /api/auth/{signup,login,logout,refresh}`, `GET /api/auth/me`
**People:** `GET|POST /api/people`, `GET|PUT|DELETE /api/people/[id]`, `POST /api/people/merge`
**Interactions:** `GET|POST /api/interactions`, `GET|PUT|DELETE /api/interactions/[id]`
**Extracted Details:** `GET /api/extracted-details`, `GET|DELETE /api/extracted-details/[id]`
**Insights:** `GET /api/insights`, `POST /api/insights/generate`, `GET|DELETE /api/insights/[id]`
**Disambiguation:** `GET /api/disambiguation`, `GET /api/disambiguation/[id]`, `POST /api/disambiguation/[id]/resolve`
**User:** `GET|PUT /api/user/profile`, `POST /api/user/onboarding`, `GET /api/user/settings`
**Webhook:** `POST /api/webhook/omi?uid={userId}` — auth via per-user `omiApiKey` (Bearer) or global `OMI_WEBHOOK_SECRET` + uid
**Pipeline:** `POST /api/pipeline/process` — manually trigger pending-interaction processing
**Shortcuts:** `POST /api/prep`, `POST /api/outreach`, `POST /api/overview`

## Auth Flow

- Passwords: bcrypt (12 rounds)
- Tokens: JWT via `jose`; access 15 min, refresh 7 days; both in httpOnly, secure, sameSite=lax cookies
- `middleware.ts` guards all `/api/*` except `/api/auth/*` and `/api/webhook/*`; auto-refreshes expired access tokens; injects `x-user-id` header
- Route handlers use `requireUserId()` from `lib/api/auth.ts`

## Environment Variables

```
DATABASE_URL           Neon PostgreSQL connection string
ANTHROPIC_API_KEY      Claude API key
JWT_ACCESS_SECRET      openssl rand -hex 32
JWT_REFRESH_SECRET     openssl rand -hex 32
OMI_WEBHOOK_SECRET     Fallback webhook secret (per-user omiApiKey takes precedence)
```

## Scripts

```
npm run dev        Next dev server (http://localhost:3000)
npm run build      Next build (runs Prisma generate via postinstall)
npm start          Production server
npm run lint       ESLint
```

Prisma migrations: `npx prisma migrate dev` / `deploy`. `postinstall` runs `prisma generate` (required for Vercel deploys).

## External Integrations

| Integration | Purpose | Entry point |
|---|---|---|
| Omi wearable | Conversation capture via webhook | `/api/webhook/omi`, `lib/omi/*` |
| Anthropic Claude | Extraction, speaker resolution, insights | `lib/ai/anthropic.ts` |
| Neon Postgres | Serverless DB | `lib/prisma.ts` |

## Notable Conventions

- All Claude calls return structured JSON; use `parseStructuredResponse<T>()` to extract JSON even when wrapped in prose.
- `Person.fingerprint` (JSON) accumulates mentions across interactions — richer than scalar fields alone for matching.
- `IdentitySignal` rows are the audit trail for *why* a speaker was matched; keep them in sync when changing the resolver.
- User's `profileSummary` is first-person context used in extraction prompts — regenerated during onboarding.
- Insights can expire (`expiresAt`) — prep briefs are 24h TTL to stay fresh.
- Tailwind theme uses CSS variables (`--color-text-primary`, `--color-border-subtle`, …); stay within that system instead of adding raw colors.
- Typed fetch wrapper `lib/api-client.ts` (`api.get/post/...`) — prefer over raw `fetch` in client code.
