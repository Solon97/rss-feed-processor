# Separação dos Módulos de Feed

## Resumo da Refatoração

A estrutura original do módulo de feeds foi separada em dois módulos distintos para melhor organização e separação de responsabilidades:

### 1. **Feed Module** (`src/feed/`)
**Responsabilidade**: CRUD de feeds e gerenciamento de subscrições de usuários

**Componentes**:
- `FeedController` - Endpoints da API
- `FeedService` - Service principal (facade)
- `FeedSubscriptionService` - Gerencia subscrições de usuários e criação de registros de feed
- `UserFeedManagementService` - Gerencia preferências e configurações do usuário

**Operações**:
- Criar subscrições de usuários
- Gerenciar status de feeds do usuário
- Configurações de notificação
- Buscar feeds e itens do usuário
- Operações de CRUD no banco de dados

### 2. **Feed Processing Module** (`src/feed-processing/`)
**Responsabilidade**: Processamento de feeds RSS e extração de conteúdo

**Componentes**:
- `FeedValidationService` - Valida e descobre feeds
- `ContentExtractionService` - Extrai conteúdo de URLs
- `FeedParsingService` - Processa feeds RSS
- `FeedValidatorService` (domain) - Lógica de validação de feeds
- `FeedDiscoveryService` (domain) - Descoberta automática de feeds
- `RssParserService` (domain) - Parsing de RSS/XML
- **Utils**: Content extractor, YouTube extractor, Thumbnail extractor

**Operações**:
- Validar URLs de feed
- Extrair conteúdo de artigos
- Processar feeds RSS/YouTube
- Descobrir feeds em websites
- Extrair metadados e thumbnails

## Arquitetura

```
┌─────────────────┐    ┌──────────────────────┐
│   Feed Module   │────│ Feed Processing      │
│   (CRUD)        │    │ Module (Processing)  │
└─────────────────┘    └──────────────────────┘
        │                       │
        ├─ FeedService          ├─ FeedValidationService
        ├─ FeedSubscription     ├─ ContentExtractionService
        │  Service              ├─ FeedParsingService
        └─ UserFeedManagement   └─ Domain Services + Utils
           Service
```

## Fluxo de Operação

### Criação de Feed:
1. **FeedService** recebe a requisição
2. Usa **FeedValidationService** (processing) para validar URL
3. Usa **FeedParsingService** (processing) para processar RSS
4. Usa **FeedSubscriptionService** (feed) para salvar no banco
5. Cria a subscrição do usuário

### Validação de Feed:
1. **FeedService** delega para **FeedValidationService**
2. Que usa os serviços de domínio para validar e descobrir feeds

## Benefícios da Separação

1. **Separação de Responsabilidades**: CRUD vs. Processamento
2. **Reutilização**: Módulo de processamento pode ser usado independentemente
3. **Testabilidade**: Cada módulo pode ser testado isoladamente
4. **Manutenibilidade**: Mudanças em processamento não afetam CRUD
5. **Escalabilidade**: Processamento pode ser movido para workers/microserviços

## Dependências

- **Feed Module** depende do **Feed Processing Module**
- **Feed Processing Module** é independente
- Ambos usam interfaces comuns em `@/feed/interfaces/feed.interface.ts`

## Próximos Passos Sugeridos

1. Mover interfaces para um módulo compartilhado
2. Adicionar testes unitários para cada módulo
3. Considerar mover processamento para workers (background jobs)
4. Implementar cache para operações de processamento
