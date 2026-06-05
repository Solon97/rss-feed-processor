# AGENTS.md — rss-feed-processor

Instructions for AI coding agents working in this repository.

## Project Purpose

`rss-feed-processor` is the domain backend of the Feedagg product. It aggregates RSS/YouTube feeds, enforces free/premium subscription rules, processes content asynchronously via a pg-boss queue, and handles Stripe billing.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS v10 (TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Queue | pg-boss (PostgreSQL-backed) |
| Auth | Supabase JWT |
| Payments | Stripe |
| Email | Resend |
| Package manager | pnpm |

## Repository Layout

```
src/
├── auth/                 # JWT strategy, guards, @CurrentUser decorator
├── feed/                 # Feed API (subscribe, list, filter items, topics)
├── feed-processing/      # DDD: domain/ (pure logic) + services/ (orchestration)
├── queue/                # pg-boss adapter, schedulers, processors
├── stripe/               # Checkout, webhook handler
├── subscription/         # Plan rules, subscription state
├── email/                # Transactional email templates + queue dispatch
├── prisma/               # PrismaService
└── config/               # EnvironmentValidationService

prisma/
└── schema.prisma         # Full data model + indexes

.specs/
├── project/              # PROJECT.md, ROADMAP.md, STATE.md
└── codebase/             # Stack, architecture, conventions, concerns docs
```

## Architectural Principles

1. **Modular by domain** — each domain has its own NestJS module; never cross-import between modules except through declared providers.
2. **Service as facade** — `feed.service` orchestrates; domain logic lives in `feed-processing/domain/`.
3. **Prisma is the only DB layer** — no raw SQL, no direct pg driver calls.
4. **Async by default for heavy work** — feed processing and emails go through the queue, never blocking HTTP handlers.
5. **Env-driven configuration** — cron schedules, API keys, and feature flags come from environment variables validated by `EnvironmentValidationService`.

## Key Workflows

### Feed Processing (Queue)

```
FeedSchedulerService (cron) → enqueue job
  → FeedProcessor.processFeed()
      → update feeds.last_fetched_at
      → fetch + parse RSS or YouTube API
      → extract full text via Mozilla Readability
      → upsert feed_items (idempotent by compound unique)
```

### Authentication

```
Request → SupabaseJwtStrategy (jwks-rsa validation)
        → AuthGuard('jwt')
        → @CurrentUser() injects user identity
        → Controller/Service enforces plan rules
```

### Stripe Billing

```
checkout.session.completed  → finalize user subscription
subscription.created/updated/resumed/paused → sync subscription state
subscription.deleted        → cancel access
subscription.trial_will_end → queue trial_ending email
```

## Coding Conventions

- **Logging**: `private readonly logger = new Logger(ClassName.name)` — use in every service, especially queue, stripe, and feed flows.
- **Error responses**: global filter returns `{ error, message, details }`.
- **DTOs**: always use class-validator decorators; controllers receive validated DTOs only.
- **UUIDs**: all primary keys are UUIDs.
- **Timestamps**: `@db.Timestamptz(6)` in UTC.
- **Cron**: never hardcode cron expressions — read from env vars (`FEED_PROCESSING_CRON`, `QUEUE_HEALTH_CHECK_CRON`).
- **New required env vars**: register in `EnvironmentValidationService` before using.

## Running the Project

```bash
cp .env.example .env          # configure secrets
pnpm run prisma:migrate       # apply DB migrations
pnpm run start:dev            # start with hot reload
```

## Testing

```bash
pnpm run test           # unit tests
pnpm run test:e2e       # end-to-end tests
pnpm run test:cov       # coverage
pnpm run lint           # lint + autofix
```

**Priority test areas**: Stripe webhook handlers, free/premium enforcement, feed item queries (filters + pagination), queue processors under failure conditions.

## Agent Guidance

- **Before modifying schema**: read `prisma/schema.prisma` and check for existing indexes and constraints.
- **Before adding a module import**: check `src/app.module.ts` to avoid circular dependencies.
- **Before adding an env var**: add it to `.env.example` and register it in `EnvironmentValidationService`.
- **For significant changes**: read `.specs/project/STATE.md` for open decisions and blockers.
- **For architecture context**: read `.specs/codebase/ARCHITECTURE.md` and `CONVENTIONS.md`.
- **For known risks**: read `.specs/codebase/CONCERNS.md` before touching flagged areas.
- **Changelog**: after relevant changes, append an entry to `.github/copilot-instructions.md` changelog section.

## Critical Files

| File | Why it matters |
|---|---|
| `src/app.module.ts` | Root dependency graph |
| `src/queue/processors/feed.processor.ts` | Core feed processing |
| `prisma/schema.prisma` | Data model + indexes |
| `src/config/environment-validation.service.ts` | Startup env validation |
| `.github/copilot-instructions.md` | Architectural changelog |
| `.specs/project/STATE.md` | Current decisions, blockers, TODOs |
