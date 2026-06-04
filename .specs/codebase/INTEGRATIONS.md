# INTEGRATIONS - rss-feed-processor

## Supabase
- Validacao JWT para autenticar chamadas do frontend/BFF.

## Stripe
- Consulta de precos ativos.
- Criacao de checkout session.
- Webhooks para sincronizar lifecycle de assinatura.

## Banco Postgres
- Prisma schema para feeds, feed_items, topics, user_feeds, user_subscriptions.

## Queue
- pg-boss para jobs de processamento.
- Cron para agendar varredura de feeds e health checks.

## Email
- Enfileiramento de emails transacionais (welcome, trial ending).

## Fontes de conteudo
- RSS/Atom e canais YouTube para descoberta e parsing.
