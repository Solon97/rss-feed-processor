# STATE - rss-feed-processor

## Snapshot
- Estado: inicializado para workflow spec-driven.
- Data base: 2026-04-15.

## Decisoes
- Backend permanece como fonte de verdade para regras de negocio do ecossistema.
- Processamento assincrono por fila e cron e parte essencial do produto.
- Regra de limite free x premium e tratada no backend.

## Blockers
- Nenhum blocker critico registrado na inicializacao.

## Riscos observados
- Divergencias de contrato com camada BFF podem gerar erros de integracao.
- Eventos Stripe fora de ordem podem impactar sincronizacao de status.
- Failures de parsing em fontes externas podem degradar cobertura de conteudo.

## TODOs de curto prazo
- Formalizar matriz de contrato endpoint entre backend e frontend.
- Definir testes obrigatorios para fluxo de assinatura e webhooks.
- Revisar estrategia de monitoramento de fila/processadores.

## Backlog diferido
- Dashboards operacionais de saude e throughput.
- Ferramentas de replay controlado de eventos para diagnostico.

## Preferencias
- Priorizar mudancas pequenas, idempotentes e validaveis por teste.
