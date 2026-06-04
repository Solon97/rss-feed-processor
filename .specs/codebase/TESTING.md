# TESTING - rss-feed-processor

## Ferramental
- Jest para testes unitarios e e2e.
- Scripts disponiveis: test, test:cov, test:e2e.

## Prioridade de cobertura
- Fluxos de assinatura e webhooks Stripe.
- Regras de limite free/premium em feed subscription.
- Consulta de itens agregados com filtros/paginacao.
- Processadores de fila (feed e email) com cenario de falha.

## Gate minimo sugerido
- Lint verde.
- Unit tests em servicos de dominio critico.
- E2E para endpoints de feed + stripe + subscriptions.
- Verificacao de regressao de webhook em ambiente de sandbox.
