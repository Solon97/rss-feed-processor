# CLAUDE.md — rss-feed-processor

Instructions for Claude Code when working in this repository.

## Project

NestJS backend for the Feedagg ecosystem. Handles RSS/YouTube feed aggregation, async processing via pg-boss queue, Stripe subscriptions, and Supabase JWT auth.

## Stack

- **Runtime**: Node.js + TypeScript (NestJS v10)
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: pg-boss (PostgreSQL-backed)
- **Auth**: Supabase JWT (`SupabaseJwtStrategy`)
- **Payments**: Stripe (subscriptions + webhooks)
- **Email**: Resend
- **Package manager**: pnpm

## Essential Commands

```bash
pnpm run start:dev          # Dev server with watch
pnpm run build              # prisma generate + nest build
pnpm run test               # Unit tests (Jest)
pnpm run test:e2e           # E2E tests
pnpm run test:cov           # Coverage report
pnpm run lint               # ESLint fix
pnpm run prisma:migrate     # Apply migrations
pnpm run prisma:studio      # Prisma Studio UI
```

## Module Structure

```
src/
├── app.module.ts            # Root module — dependency graph entry point
├── auth/                    # JWT guards, SupabaseJwtStrategy, @CurrentUser decorator
├── feed/                    # Feed endpoints: subscribe, list, filter, topics
├── feed-processing/         # Domain + Application layers (DDD), parser, readability
├── queue/                   # pg-boss adapter, FeedSchedulerService, processors
├── stripe/                  # Checkout, webhook controller, subscription events
├── subscription/            # Plan rules (free/premium limits), subscription state
├── email/                   # Templates + async job dispatch via Resend
├── prisma/                  # PrismaService singleton
└── config/                  # EnvironmentValidationService (centralized env validation)
```

## Key Patterns

- **feed.service** is a facade/orchestrator — application logic flows through it.
- **feed-processing** is split into `domain/` (pure logic) and `services/` (orchestration).
- All cron expressions come from env vars (`FEED_PROCESSING_CRON`, `QUEUE_HEALTH_CHECK_CRON`).
- Logging: `private readonly logger = new Logger(ClassName.name)` in every service.
- Response format on errors: `{ error, message, details }` via global filter.
- DTOs use class-validator; controllers never hold business logic.
- Prisma is the only DB access layer — no raw SQL unless absolutely necessary.

## Authentication

- All authenticated routes use `@UseGuards(AuthGuard('jwt'))` + `@CurrentUser()`.
- JWT validated by Supabase public keys via `jwks-rsa`.
- User identity extracted by `authService.extractUserInfo(payload)`.

## Queue / Cron

- `FeedSchedulerService.setupCronJobs()` (OnModuleInit) registers crons dynamically via `SchedulerRegistry`.
- `FeedProcessor.processFeed()`: update `last_fetched_at` → fetch/parse feed → extract content via Readability → upsert `feed_items`.
- Email jobs: `welcome` and `trial_ending` are enqueued from webhook/subscription events.

## Stripe Webhooks

Handled in `src/stripe/controllers/webhook.controller.ts`:
- `customer.subscription.created/updated/resumed/paused` → subscription management
- `customer.subscription.deleted` → cancellation
- `customer.subscription.trial_will_end` → queue `trial_ending` email
- `checkout.session.completed` → finalize checkout

## Database

- All IDs: UUID.
- Timestamps: `@db.Timestamptz(6)` in UTC.
- Compound indexes on `[user_id, is_active, topic_id]` for read-path queries.
- Composite unique constraints enforce de-duplication on `feed_items`.

## Environment

- Copy `.env.example` → `.env` for local.
- Required: `SUPABASE_*`, `DATABASE_URL`, `YOUTUBE_API_KEY`, `STRIPE_*`, `RESEND_API_KEY`, cron expressions.
- `EnvironmentValidationService` validates all required vars on startup — never bypass it.

## Testing

- Unit tests: `*.spec.ts` inside `src/`.
- E2E tests: `test/` directory with `jest-e2e.json` config.
- Priority areas: Stripe webhooks, free/premium subscription rules, feed query filters/pagination, queue processors (including failure paths).

## Critical Files

| File | Purpose |
|---|---|
| `src/app.module.ts` | Module wiring — check before adding imports |
| `src/queue/processors/feed.processor.ts` | Core feed processing logic |
| `prisma/schema.prisma` | Data model + indexes |
| `src/config/environment-validation.service.ts` | Env validation |
| `.github/copilot-instructions.md` | Detailed changelog of architectural decisions |

## Specs

The `.specs/` directory contains living documentation:
- `.specs/project/` — PROJECT.md, ROADMAP.md, STATE.md
- `.specs/codebase/` — STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS

Read STATE.md before planning significant changes — it tracks open decisions and blockers.

## Do Not

- Do not add raw SQL queries — use Prisma.
- Do not hardcode cron expressions — use env vars.
- Do not add business logic in controllers.
- Do not skip `EnvironmentValidationService` for new required env vars.
- Do not commit `.env` — it is gitignored.
