# Filtros da API de Feed Items

A rota `/feed/user-feed-items` foi aprimorada com novos filtros para facilitar a busca de itens específicos.

## Parâmetros de Filtro Disponíveis

### Filtros Existentes
- `limit`: Limite de itens retornados (1-100, padrão: 20)
- `offset`: Deslocamento para paginação (padrão: 0)
- `sort`: Campo de ordenação (`created_at` ou `published_at`, padrão: `published_at`)
- `order`: Ordem da classificação (`asc` ou `desc`, padrão: `desc`)

### Novos Filtros
- `title`: Filtro por título do item (busca parcial, case-insensitive)
- `feed_id`: Filtro por ID específico do feed (UUID)
- `feed_type`: Filtro por tipo de feed (`rss` ou `youtube`)

## Exemplos de Uso

### 1. Buscar por título
```
GET /feed/user-feed-items?title=javascript
GET /feed/user-feed-items?title=tutorial
```

### 2. Buscar por feed específico
```
GET /feed/user-feed-items?feed_id=550e8400-e29b-41d4-a716-446655440000
```

### 3. Buscar apenas conteúdo do YouTube
```
GET /feed/user-feed-items?feed_type=youtube
```

### 4. Buscar apenas feeds RSS tradicionais
```
GET /feed/user-feed-items?feed_type=rss
```

### 5. Combinando filtros
```
GET /feed/user-feed-items?title=react&feed_type=youtube&limit=10
GET /feed/user-feed-items?feed_id=550e8400-e29b-41d4-a716-446655440000&title=tutorial&sort=created_at&order=asc
```

## Lógica de Filtro por Tipo

- **youtube**: Feeds cuja URL contém "youtube.com"
- **rss**: Todos os outros feeds (não contém "youtube.com" na URL)

## Resposta da API

A estrutura da resposta permanece a mesma, contendo:
- `id`: ID do item do feed
- `title`: Título do item
- `url`: URL do item
- `content`: Conteúdo extraído (opcional)
- `thumbnail`: URL da thumbnail (opcional)
- `published_at`: Data de publicação
- `created_at`: Data de criação no sistema
- `feed`: Informações do feed (id, name, url)

## Validação

- `title`: Deve ser uma string (opcional)
- `feed_id`: Deve ser um UUID v4 válido (opcional)
- `feed_type`: Deve ser 'rss' ou 'youtube' (opcional)
- Todos os filtros são opcionais e podem ser combinados
