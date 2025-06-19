# RSS Feed Processor

Uma aplicação NestJS que processa feeds RSS e canais do YouTube, seguindo os princípios SOLID.

## Funcionalidades

- ✅ Validação de feeds RSS e canais do YouTube
- ✅ Descoberta automática de feeds em websites
- ✅ Extração de conteúdo de artigos usando Readability
- ✅ Extração de thumbnails
- ✅ Processamento dos 5 itens mais recentes

## Instalação

```bash
# Instalar dependências
pnpm install

# Compilar
pnpm run build

# Executar em desenvolvimento
pnpm run start:dev

# Executar em produção
pnpm run start:prod
```

## Endpoints

### 1. Validar Feed e Obter URLs

Valida uma URL de feed RSS ou canal do YouTube e retorna as URLs dos 5 últimos itens.

```
GET /feed/validate?url=<URL_DO_FEED>
```

**Exemplos:**

```bash
# Feed RSS direto
curl "http://localhost:3000/feed/validate?url=https://feeds.bbci.co.uk/news/rss.xml"

# Canal do YouTube
curl "http://localhost:3000/feed/validate?url=https://www.youtube.com/@channelname"

# Website com feed RSS
curl "http://localhost:3000/feed/validate?url=https://example.com"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "type": "rss",
    "title": "BBC News",
    "urls": [
      "https://www.bbc.com/news/article1",
      "https://www.bbc.com/news/article2",
      "https://www.bbc.com/news/article3",
      "https://www.bbc.com/news/article4",
      "https://www.bbc.com/news/article5"
    ]
  }
}
```

### 2. Extrair Conteúdo

Extrai o conteúdo completo de um artigo ou vídeo específico.

```
GET /feed/extract?url=<URL_DO_CONTEUDO>
```

**Exemplos:**

```bash
# Artigo
curl "http://localhost:3000/feed/extract?url=https://example.com/article"

# Vídeo do YouTube
curl "http://localhost:3000/feed/extract?url=https://youtube.com/watch?v=VIDEO_ID"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "title": "Título do Artigo",
    "link": "https://example.com/article",
    "content": "<p>Conteúdo extraído...</p>",
    "thumbnail": "https://example.com/image.jpg",
    "pubDate": "2025-06-18T10:00:00.000Z"
  }
}
```

## Arquitetura SOLID

O projeto foi estruturado seguindo os princípios SOLID:

### Single Responsibility Principle (SRP)
- `FeedValidatorService`: Responsável apenas por validar feeds
- `FeedDiscoveryService`: Responsável por descobrir feeds em websites
- `ContentExtractorService`: Responsável por extrair conteúdo
- `ThumbnailExtractorService`: Responsável por extrair thumbnails
- `RssParserService`: Responsável por fazer parse de RSS

### Open/Closed Principle (OCP)
- Serviços podem ser estendidos sem modificar o código existente
- Interfaces bem definidas permitem novas implementações

### Liskov Substitution Principle (LSP)
- Todas as implementações de serviços seguem suas interfaces

### Interface Segregation Principle (ISP)
- Interfaces específicas e focadas em responsabilidades únicas

### Dependency Inversion Principle (DIP)
- Serviços dependem de abstrações (outros serviços), não de implementações concretas
- Injeção de dependência através do sistema DI do NestJS

## Estrutura do Projeto

```
src/
├── feed/
│   ├── dto/
│   │   └── feed.dto.ts           # DTOs para validação
│   ├── interfaces/
│   │   └── feed.interface.ts     # Interfaces TypeScript
│   ├── services/
│   │   ├── feed.service.ts                # Serviço principal (orquestrador)
│   │   ├── feed-validator.service.ts      # Validação de feeds
│   │   ├── feed-discovery.service.ts      # Descoberta de feeds
│   │   ├── rss-parser.service.ts          # Parse de RSS
│   │   ├── content-extractor.service.ts   # Extração de conteúdo
│   │   └── thumbnail-extractor.service.ts # Extração de thumbnails
│   ├── feed.controller.ts        # Controller REST
│   └── feed.module.ts           # Módulo NestJS
├── app.module.ts
└── main.ts
```

## Tratamento de Erros

A aplicação possui tratamento robusto de erros:

- URLs inválidas retornam erro 400
- Feeds não encontrados retornam erro 400
- Timeouts são configurados para evitar travamentos
- Falhas de extração são tratadas graciosamente

## Dependências Principais

- `@nestjs/common`: Framework NestJS
- `undici`: Cliente HTTP moderno
- `jsdom`: Parser HTML/DOM
- `rss-parser`: Parser de feeds RSS/Atom
- `@mozilla/readability`: Extração de conteúdo de artigos
- `class-validator`: Validação de DTOs
- `class-transformer`: Transformação de dados
