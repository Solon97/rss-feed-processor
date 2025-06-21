# API de Criação de User Feed

## Endpoint: POST /feed/subscribe

Esta rota permite que um usuário se inscreva em um feed RSS. A lógica implementada funciona da seguinte forma:

### Funcionalidade

1. **Valida o feed URL** - Verifica se a URL fornecida é um feed RSS válido
2. **Verifica se o feed já existe** - Busca na tabela `feeds` pela URL do feed
3. **Se o feed não existir:**
   - Valida e cria o feed na tabela `feeds`
   - Extrai o conteúdo dos últimos 5 itens do feed RSS
   - Salva os itens na tabela `feed_items`
4. **Se o feed já existir:**
   - Usa o feed existente
5. **Cria a inscrição** - Vincula o usuário ao feed na tabela `user_feeds`

### Requisição

```http
POST /feed/subscribe
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "url": "https://example.com/feed.xml"
}
```

### Headers Obrigatórios
- `Authorization: Bearer <token>` - JWT token do Supabase para autenticação

### Body
- `url` (string, obrigatório): URL do feed RSS válida com protocolo (http/https)

### Resposta de Sucesso (201)

```json
{
  "success": true,
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario@email.com"
  },
  "data": {
    "feed": {
      "id": "uuid-do-feed",
      "name": "Nome do Feed",
      "url": "https://example.com/feed.xml",
      "is_active": true,
      "status": "active",
      "created_at": "2025-06-21T20:41:35.000Z",
      "updated_at": "2025-06-21T20:41:35.000Z",
      "last_fetched_at": "2025-06-21T20:41:35.000Z"
    },
    "userFeed": {
      "user_id": "uuid-do-usuario",
      "feed_id": "uuid-do-feed",
      "is_active": true,
      "access_permissions": "read",
      "notification_enabled": true,
      "notification_frequency": "immediate",
      "created_at": "2025-06-21T20:41:35.000Z",
      "updated_at": "2025-06-21T20:41:35.000Z"
    },
    "message": "Feed criado e usuário inscrito com sucesso"
  }
}
```

### Resposta de Erro (400)

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

### Possíveis Erros

- `"URL deve ser uma URL válida com protocolo (http/https)"` - URL inválida
- `"Feed inválido ou não encontrado"` - A URL não contém um feed RSS válido
- `"Usuário já está inscrito neste feed"` - O usuário já possui uma inscrição ativa para este feed

### Exemplo de Uso com curl

```bash
curl -X POST http://localhost:3000/feed/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://feeds.feedburner.com/oreilly-radar"
  }'
```

### Estrutura das Tabelas Envolvidas

#### feeds
- `id`: UUID (PK)
- `name`: Nome do feed
- `url`: URL do feed (unique)
- `is_active`: Status ativo/inativo
- `status`: Status do feed
- `last_fetched_at`: Última atualização

#### feed_items
- `id`: UUID (PK)
- `feed_id`: Referência ao feed (FK)
- `title`: Título do item
- `url`: URL do item
- `content`: Conteúdo extraído (TEXT)
- `thumbnail`: URL da thumbnail
- `published_at`: Data de publicação

#### user_feeds
- `user_id`: ID do usuário (PK composta)
- `feed_id`: ID do feed (PK composta, FK)
- `is_active`: Inscrição ativa
- `access_permissions`: Permissões de acesso
- `notification_enabled`: Notificações habilitadas
- `notification_frequency`: Frequência das notificações

### Configurações

A aplicação respeita a variável de ambiente `MAX_FEED_ITEMS` (padrão: 5) para limitar quantos itens serão extraídos e salvos quando um novo feed é criado.
