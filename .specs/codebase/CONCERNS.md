# CONCERNS - rss-feed-processor

## Contrato com frontend
- Divergencias de metodo/payload podem quebrar BFF e UX.

## Webhooks Stripe
- Eventos fora de ordem ou repetidos exigem idempotencia e reconciliacao robusta.

## Processamento de feed
- Fontes externas instaveis geram falhas intermitentes.
- Necessario monitorar retries e erro por feed.

## Regras de assinatura
- Inconsistencia de status pode liberar ou bloquear feeds indevidamente.

## Fila e operacao
- Queda de fila ou gargalo em jobs impacta atualizacao de conteudo.

## Sugestoes de mitigacao
- Testes de contrato + e2e dos fluxos principais.
- Logs estruturados com correlacao por request/event/job.
- Dashboards de saude para webhook, queue e latencia de endpoints.
