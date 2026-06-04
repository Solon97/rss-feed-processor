# CONVENTIONS - rss-feed-processor

## Organizacao
- Estrutura modular por dominio no src.
- Separacao entre controllers, services, dto e interfaces.

## API
- Controllers definem contratos HTTP.
- DTOs + validation pipes para saneamento de entrada.
- Interceptors e filters globais para log e excecoes.

## Dominio de feed
- feed.service atua como facade/orquestrador.
- servicos de aplicacao isolam regras de inscricao e consulta.

## Persistencia
- Prisma como camada unica de acesso ao banco.
- IDs UUID e enums para estados de dominio.

## Observabilidade
- Logger do Nest em fluxos criticos (queue, stripe, feed).
