# PROJECT - rss-feed-processor

## Visao
rss-feed-processor e o backend de dominio do ecossistema Feedagg, responsavel por autenticacao, processamento de feeds, exposicao de API de negocio, assinatura e automacoes assicronas.

## Problema
Sem uma camada de processamento dedicada, agregacao de conteudo e regras de assinatura ficam dispersas, inconsistentes e dificeis de operar em escala.

## Objetivo do Produto
Centralizar regras de negocio de feeds e assinatura em uma API NestJS robusta, com persistencia consistente, fila de processamento e integracoes externas confiaveis.

## Objetivos de Negocio
- Suportar experiencia premium (limite free e desbloqueio premium).
- Assegurar atualizacao recorrente e priorizada de feeds.
- Reduzir falhas operacionais em pagamentos, webhooks e jobs.

## Objetivos Tecnicos
- Manter arquitetura modular NestJS (feed, stripe, queue, auth, subscription).
- Garantir rastreabilidade de estado no banco via Prisma/Postgres.
- Tratar processamento de feed de forma assincrona com fila e cron.

## Escopo Inicial (In)
- Endpoints de feed: validar, assinar, listar, filtrar itens, status e remocao.
- Endpoints de topicos por usuario.
- Endpoints de assinatura e Stripe (precos, checkout, webhooks).
- Jobs de fila para processamento de feed e envio de email.
- Integracao com Supabase JWT para autenticacao.

## Fora de Escopo Inicial (Out)
- Recomendacao de conteudo com IA.
- Painel administrativo completo para operacao manual.
- Multi-regiao com failover ativo-ativo.

## Stakeholders
- Aplicacao feedagg (frontend/BFF).
- Usuario final assinante e nao assinante.
- Operacao tecnica do produto.

## Restricoes
- Dependencia de APIs externas (RSS/YouTube/Stripe/Supabase).
- Sensivel a configuracao de segredos e variaveis de ambiente.
- Dependencia de disponibilidade de banco e fila.

## Sinais de Sucesso
- Processamento recorrente estavel de feeds ativos.
- Baixa taxa de erro em webhooks Stripe.
- Consistencia entre status de assinatura e acesso aos feeds.
- Tempo de resposta adequado nas consultas de itens agregados.
