# ROADMAP - rss-feed-processor

## Fase 0 - Baseline concluido
- API NestJS modular em producao de desenvolvimento.
- Prisma schema com entidades de feed, topicos, user_feeds e assinatura.
- Integracao inicial com Stripe e fila de processamento.

## Fase 1 - Contratos e consistencia
Objetivo: estabilizar contrato com consumidores (feedagg).
- Revisar metodos HTTP e payloads de endpoints de feed/topicos/subscription.
- Padronizar formatos de erro e mensagens.
- Criar testes de contrato para fluxos criticos.

## Fase 2 - Processamento e fila
Objetivo: elevar confiabilidade e throughput dos jobs.
- Revisar politicas de retry e observabilidade de jobs.
- Garantir idempotencia de processamento por feed item.
- Melhorar visibilidade de falhas por feed e por execucao.

## Fase 3 - Assinaturas Stripe
Objetivo: reduzir inconsistencias de ciclo de assinatura.
- Endurecer fluxo checkout -> webhook -> persistencia.
- Reforcar sincronizacao de status com regras de acesso aos feeds.
- Aumentar cobertura de testes para eventos principais de webhook.

## Fase 4 - Seguranca e operacao
Objetivo: reduzir risco operacional.
- Revisar guards e validacoes de autenticacao/autorizacao.
- Auditar variaveis de ambiente obrigatorias e fallback seguro.
- Melhorar logs estruturados para investigacao de incidentes.

## Fase 5 - Performance de leitura
Objetivo: acelerar consultas de itens agregados.
- Ajustar consultas e indices conforme perfil real de uso.
- Validar paginacao e filtros com datasets maiores.
- Definir SLOs de latencia para endpoints de leitura.

## Dependencias externas continuas
- Banco Postgres
- Stripe API e webhooks
- Supabase JWT
- Fontes RSS/YouTube
