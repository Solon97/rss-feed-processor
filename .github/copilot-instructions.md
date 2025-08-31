# RSS Feed Processor - AI Coding Assistant Instructions

## 🔄 Meta-Guideline

Whenever there are **relevant changes** in the project (new services, architecture updates, code conventions, authentication flow changes, database schema updates, queue/job changes, or external integrations), **Copilot must update this instructions file**.

- Always **review the entire file** to ensure consistency.
- Always **append a new entry to the Changelog** describing what changed (date + short description).
- This file is the single source of truth for the project’s architecture and workflows.

---

## Architecture Overview

This project is an **RSS/YouTube feed aggregation service** built with **NestJS**, using:

- **Database**: PostgreSQL with Prisma ORM
- **Queues**: PgBoss (PostgreSQL-backed)
- **Authentication**: Supabase (JWT strategy)
- **Payments**: Stripe (subscriptions + webhooks)

### Core Components

- **Queue System**: PgBoss (`src/queue/`), scheduled jobs every 30 minutes
- **Feed Processing**: Domain-driven design (`src/feed-processing/` → Application + Domain layers)
- **Authentication**: Custom Supabase JWT strategy (`src/auth/strategies/`)
- **Data Layer**: Prisma with optimized indexes (`prisma/schema.prisma`)

### Key Data Models

```typescript
feeds → feed_items (1:many)     // RSS/YouTube content
user_feeds (composite PK)       // User subscriptions with topics
stripe_customers ↔ user_subscriptions  // Payment integration
```

---

## Development Workflows

### Local Development

```bash
# Run migrations
pnpm run prisma:migrate

# Start application with queue workers
pnpm run start:dev
```

### Queue Architecture Pattern

`FeedProcessor.processFeed()` flow:

1. Updates `feeds.last_fetched_at`
2. Fetches and parses RSS/YouTube (max 10 latest items)
3. Extracts content with Mozilla Readability
4. Upserts into `feed_items` (duplicate-safe)

**Cron Jobs**: All cron expressions are configured via environment variables:

- `FEED_PROCESSING_CRON` - Feed processing schedule (default: every 30 minutes)
- `QUEUE_HEALTH_CHECK_CRON` - Health check schedule (default: every 5 minutes)
- Uses `SchedulerRegistry` with dynamic cron setup in `FeedSchedulerService.setupCronJobs()`

---

## Error Handling Conventions

- **Global filter**: `src/common/filters/`
- **Response format**: `{ error, message, details }`
- **Logging**: `private readonly logger = new Logger(ServiceName.name)`

---

## Project-Specific Patterns

### Service Layer

- **Domain Services**: Pure business logic (`feed-processing/domain/`)
- **Application Services**: Orchestration & validation (`feed-processing/services/`)
- **Infrastructure**: Queue adapters and external integrations

### Database Query Patterns

- Compound indexes: `[user_id, is_active, topic_id]`
- Composite constraints: `@unique([field1, field2])`
- UTC timestamps with `@db.Timestamptz(6)`

### Authentication Flow

- Supabase JWTs validated with `SupabaseJwtStrategy`
- User extracted via `authService.extractUserInfo(payload)`
- Routes use `@CurrentUser()` decorator

### Environment Configuration

- Centralized validation in `EnvironmentValidationService`
- Copy `.env.example` → `.env` for local setup
- Required keys: Supabase, PostgreSQL, YouTube API, Stripe, Queue System cron expressions
- **Cron Jobs**: All cron expressions are configurable via environment variables (no hardcoded values)

---

## Integration Points

### External APIs

- **YouTube Data API v3** → channel/playlist metadata
- **Supabase** → authentication provider (no direct DB queries)
- **Stripe** → webhook handlers in `src/stripe/controllers/webhook.controller.ts`

### Queue Job Types

- `feed-processing` → scheduled RSS/YouTube updates
- `email` → notification jobs (via Resend provider)

### Content Processing

- **RSS**: parser with fallback readability extraction
- **YouTube**: API-based metadata (duration in ISO 8601)
- **Sanitization**: Mozilla Readability for full-text

---

## Critical Files

- `src/app.module.ts` → module dependency graph
- `src/queue/processors/feed.processor.ts` → core queue processor
- `prisma/schema.prisma` → full data model + indexes
- `src/config/environment-validation.service.ts` → environment validator

---

## 📜 Changelog

> **Instructions for Copilot**: After every relevant change in the project, add a new dated entry here and review/update the entire document.

- **2025-08-31**: Added **Changelog section** and explicit Copilot instructions for maintaining this document.
- **2025-08-31**: **Refactored cron jobs to use environment variables**: Replaced hardcoded `CronExpression.EVERY_30_MINUTES` and `CronExpression.EVERY_5_MINUTES` with dynamic cron expressions from environment variables (`FEED_PROCESSING_CRON`, `QUEUE_HEALTH_CHECK_CRON`). Updated `FeedSchedulerService` to use `SchedulerRegistry` with `OnModuleInit` pattern for proper dynamic cron setup. Added validation for cron environment variables in `EnvironmentValidationService`.

---

👉 **Final Reminder for Copilot**:  
Every time you make a relevant project change:

1. Update this file to reflect new architecture/flows.
2. Add a new **Changelog entry**.
3. Review the full file for consistency.
