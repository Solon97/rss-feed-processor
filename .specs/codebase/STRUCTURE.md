# STRUCTURE - rss-feed-processor

## Diretorios de dominio
- src/auth: autenticacao, guards e estrategia JWT
- src/feed: endpoints e servicos de feed/topicos
- src/feed-processing: parser/validator/extracao
- src/queue: fila, scheduler, processors e webhook de signup
- src/stripe: checkout, prices, webhooks e servicos stripe
- src/subscription: consulta e manutencao de subscriptions
- src/email: templates e envio
- src/prisma: prisma module/service
- prisma/: schema e migracoes

## Entradas HTTP relevantes
- /auth/login
- /feed/*
- /topics/*
- /subscriptions/*
- /stripe/*
- /webhook/user-signup

## Fluxos assicronos
- feed-processing-priority
- feed-processing-default
- email-processing
