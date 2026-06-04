# ARCHITECTURE - rss-feed-processor

## Visao de alto nivel
- API modular NestJS para dominio feed/subscription/stripe.
- Persistencia central em Postgres via Prisma.
- Processamento de feeds e emails via fila assicrona.
- Jobs recorrentes via cron para agendar processamento.

## Modulos centrais
- auth: guardas, estrategia JWT, decorators de usuario
- feed: validacao, inscricao, consultas e topicos
- feed-processing: parser, validator, extracao de conteudo
- queue: adaptador de fila, schedulers e processors
- stripe/subscription: checkout, webhooks e estado de assinatura
- email: templates e envio assicrono

## Fluxo principal de negocio
1. Usuario autenticado chama endpoint de feed
2. Backend valida permissao e regra de plano
3. Persistencia cria/atualiza subscription/feed/user_feed
4. Fila processa feed e popula feed_items
5. Frontend consulta itens agregados filtrados

## Fronteiras
- Regras de plano e assinatura residem no backend.
- Frontend deve consumir via contrato HTTP estavel.
