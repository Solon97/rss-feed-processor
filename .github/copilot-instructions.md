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
- `QUEUE_FEED_DEFAULT_CONCURRENCY` - Local worker concurrency for default feed queue (default in `.env.example`: 3)
- `QUEUE_FEED_PRIORITY_CONCURRENCY` - Local worker concurrency for priority feed queue (default in `.env.example`: 2)
- `QUEUE_EMAIL_CONCURRENCY` - Local worker concurrency for email queue (default in `.env.example`: 3)
- Uses `SchedulerRegistry` with dynamic cron setup in `FeedSchedulerService.setupCronJobs()`

---

## Error Handling Conventions

- **Global filter**: `src/common/filters/`
- **Global interceptors**: `src/common/interceptors/` (request logging, error logging)
- **Response format**: `{ error, message, details }`
- **Logging**: `private readonly logger = new Logger(ServiceName.name)`
- **Request Logging**: All HTTP requests are automatically logged with duration, status, and sanitized payload

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
- **Queue Workers**: Queue worker concurrency can be tuned by environment variables per queue
- **Secret Handling**: Real credentials must never be committed to the repo; `.env.example` and documentation must use placeholders only, and any leaked key must be rotated immediately and purged from Git history if needed.

---

## Integration Points

### External APIs

- **YouTube Data API v3** → channel/playlist metadata
- **Supabase** → authentication provider (no direct DB queries)
- **Stripe** → webhook handlers in `src/stripe/controllers/webhook.controller.ts`
  - `customer.subscription.created/updated/resumed/paused` → subscription management
  - `customer.subscription.deleted` → subscription cancellation
  - `customer.subscription.trial_will_end` → informational email about trial ending
  - `checkout.session.completed` → checkout completion

### Queue Job Types

- `feed-processing` → scheduled RSS/YouTube updates
- `email` → notification jobs (via Resend provider)
  - `welcome` → welcome email for new users
  - `trial_ending` → informational email when trial is ending

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
- **2025-08-31**: **Refactored cron jobs to use environment variables**: Replaced hardcoded `CronExpression.EVERY_30_MINUTES` and `CronExpression.EVERY_5_MINUTES` with dynamic cron expressions from environment configuration.
- **2025-08-31**: **Added global request logging interceptor**: Created `RequestLoggingInterceptor` in `src/common/interceptors/` to log all HTTP requests with method, URL, duration, status code, and sanitized payload.
- **2025-09-04**: **Added trial ending email functionality**: Created new email template (`trial_ending.html`) and handler for Stripe webhook `customer.subscription.trial_will_end`. Email uses internal queue infrastructure and the Resend provider.
- **2026-06-05**: **Added configurable pg-boss worker concurrency per queue**: Extended queue adapter worker registration to accept pg-boss worker options and wired `localConcurrency` through `WorkerOptions` environment variables.
- **2026-10-29**: **Rotated exposed Google API key and hardened env example guidance**: Removed the leaked YouTube API key from `.env.example`, replaced it with a placeholder, and documented the policy to never commit real secrets to the repository.

---

👉 **Final Reminder for Copilot**:  
Every time you make a relevant project change:

1. Update this file to reflect new architecture/flows.
2. Add a new **Changelog entry**.
3. Review the full file for consistency.
