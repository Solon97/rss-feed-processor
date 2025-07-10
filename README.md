# RSS Feed Processor com Autenticação Supabase

Um serviço NestJS para processar feeds RSS com autenticação JWT do Supabase.

## 🚀 Funcionalidades

- **Validação de Feeds RSS**: Valida URLs de feeds e retorna os últimos 5 itens
- **Extração de Conteúdo**: Extrai conteúdo limpo de artigos usando Mozilla Readability
- **Autenticação JWT**: Proteção de rotas usando tokens JWT do Supabase
- **Descoberta Automática de Feeds**: Detecta feeds RSS/Atom automaticamente
- **Extração de Thumbnails**: Extrai imagens de destaque dos artigos
- **Sistema de Filas QStash**: Processamento assíncrono e confiável de feeds

## 📊 Sistema de Filas com QStash

Esta aplicação utiliza [QStash](https://upstash.com/qstash) para processamento assíncrono de feeds RSS:

### Características:
- **Serverless**: Não requer Redis ou infraestrutura adicional
- **Prioridades inteligentes**: Feeds com mais usuários são processados primeiro
- **Retry automático**: QStash gerencia tentativas de reprocessamento
- **Webhooks HTTP**: Processamento via endpoints REST

### Configuração QStash:
```bash
# Variáveis necessárias no .env
QSTASH_TOKEN=your_qstash_token_here
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key_here
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key_here
WEBHOOK_BASE_URL=https://your-app-domain.com
```

Para mais detalhes, consulte [QSTASH_MIGRATION.md](./QSTASH_MIGRATION.md).

## 🔒 Autenticação

Todas as rotas da API são protegidas por autenticação JWT do Supabase. Você precisa incluir um token válido no header `Authorization` de suas requisições.

### Como obter um token JWT do Supabase

1. Faça login no seu projeto Supabase
2. Use a função `signInWithEmail` ou `signInWithPassword` do cliente Supabase
3. O token será retornado na propriedade `access_token`

### Como usar o token

Inclua o token no header Authorization:

```
Authorization: Bearer <seu-jwt-token>
```
## 📦 Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd rss-feed-processor

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
```

## ⚙️ Configuração

### Variáveis de Ambiente

Edite o arquivo `.env` com suas configurações:

```bash
# Porta da aplicação
PORT=3000

# Timeouts (em milissegundos)
RSS_FETCH_TIMEOUT=5000
WEBSITE_FETCH_TIMEOUT=10000
CONTENT_FETCH_TIMEOUT=15000

# User Agent para requisições HTTP
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# Máximo de itens a processar por feed
MAX_FEED_ITEMS=5

# Configuração do Supabase (OBRIGATÓRIO)
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

### Como obter a chave JWT do Supabase

1. Acesse o [painel do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **Settings** > **API**
4. Copie o valor em **JWT Secret**
5. Cole no arquivo `.env` na variável `SUPABASE_JWT_SECRET`

### 🌐 Configuração de CORS

O servidor possui configuração automática de CORS baseada no ambiente:

**Desenvolvimento:**
- Permite origens localhost nas portas 3000, 3001, 5173, 4173

**Produção:**
- Permite domínios de Vercel, Netlify e Render por padrão
- Para personalizar, edite as origens permitidas em `src/main.ts`

**Para testes ou desenvolvimento com origens específicas:**
```bash
# No arquivo .env, adicione:
CORS_ORIGIN=all  # Permite todas as origens (apenas para teste)
```

**⚠️ Importante:** Em produção, sempre configure origens específicas para segurança.

## 🏃‍♂️ Executando a aplicação

```bash
# Desenvolvimento
pnpm run start:dev

# Produção
pnpm run build
pnpm run start:prod
```

A aplicação estará disponível em `http://localhost:3000`

## 📡 Endpoints da API

### 1. Validar Feed RSS

Valida um feed RSS e retorna os últimos 5 itens.

**Endpoint:** `GET /feed/validate`

**Parâmetros:**
- `url` (query, obrigatório): URL do feed RSS

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3000/feed/validate?url=https://example.com/feed.xml" \
  -H "Authorization: Bearer <seu-jwt-token>"
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  },
  "data": {
    "title": "Blog Example",
    "description": "Descrição do blog",
    "link": "https://example.com",
    "feedUrl": "https://example.com/feed.xml",
    "items": [
      {
        "title": "Título do artigo",
        "link": "https://example.com/article-1",
        "pubDate": "2025-06-19T10:00:00.000Z",
        "creator": "Autor",
        "summary": "Resumo do artigo...",
        "thumbnail": "https://example.com/image.jpg"
      }
    ]
  }
}
```

### 2. Extrair Conteúdo

Extrai o conteúdo limpo de uma URL específica.

**Endpoint:** `GET /feed/extract`

**Parâmetros:**
- `url` (query, obrigatório): URL do artigo

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3000/feed/extract?url=https://example.com/article" \
  -H "Authorization: Bearer <seu-jwt-token>"
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  },
  "data": {
    "title": "Título do artigo",
    "content": "Conteúdo limpo do artigo...",
    "textContent": "Versão em texto puro...",
    "length": 1500,
    "excerpt": "Resumo do artigo...",
    "siteName": "Nome do site",
    "thumbnail": "https://example.com/image.jpg"
  }
}
```

## 🔐 Autenticação com Supabase

### Exemplo com JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Fazer login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

if (data.session) {
  const token = data.session.access_token
  
  // Usar o token nas requisições
  const response = await fetch('http://localhost:3000/feed/validate?url=https://example.com/feed.xml', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  const result = await response.json()
  console.log(result)
}
```

### Exemplo com Python

```python
import requests
from supabase import create_client, Client

# Configurar cliente Supabase
supabase: Client = create_client(
    "https://your-project.supabase.co", 
    "your-anon-key"
)

# Fazer login
response = supabase.auth.sign_in_with_password({
    "email": "user@example.com",
    "password": "password"
})

if response.session:
    token = response.session.access_token
    
    # Usar o token nas requisições
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        "http://localhost:3000/feed/validate",
        params={"url": "https://example.com/feed.xml"},
        headers=headers
    )
    
    print(response.json())
```

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
src/
├── auth/                     # Módulo de autenticação
│   ├── decorators/          # Decorators personalizados
│   │   └── current-user.decorator.ts
│   ├── guards/              # Guards de autenticação
│   │   └── supabase-jwt-auth.guard.ts
│   ├── strategies/          # Estratégias do Passport
│   │   └── supabase-jwt.strategy.ts
│   ├── auth.module.ts       # Módulo de autenticação
│   └── auth.service.ts      # Serviço de autenticação
├── feed/                    # Módulo de feeds
│   ├── dto/                 # Data Transfer Objects
│   ├── interfaces/          # Interfaces TypeScript
│   ├── services/            # Serviços de negócio
│   ├── feed.controller.ts   # Controller principal
│   └── feed.module.ts       # Módulo de feeds
├── app.module.ts            # Módulo principal
└── main.ts                  # Arquivo de entrada
```

### Scripts Disponíveis

```bash
# Desenvolvimento
pnpm run start:dev

# Build
pnpm run build

# Testes
pnpm run test
pnpm run test:e2e

# Linting
pnpm run lint
pnpm run format
```

## 🚨 Tratamento de Erros

### Erros de Autenticação

- **401 Unauthorized**: Token inválido, expirado ou ausente
- **403 Forbidden**: Token válido mas sem permissões suficientes

### Erros de Validação

- **400 Bad Request**: URL inválida ou parâmetros incorretos
- **404 Not Found**: Feed não encontrado
- **500 Internal Server Error**: Erro interno do servidor

### Exemplo de resposta de erro

```json
{
  "success": false,
  "message": "Token inválido"
}
```

## 📝 Logs

A aplicação registra automaticamente:
- Tentativas de autenticação
- Validações de feed
- Extrações de conteúdo
- Erros e exceções

## 🔧 Configurações Avançadas

### Timeouts

Você pode ajustar os timeouts para diferentes operações:

```bash
RSS_FETCH_TIMEOUT=5000      # Timeout para buscar feeds RSS
WEBSITE_FETCH_TIMEOUT=10000 # Timeout para buscar páginas web
CONTENT_FETCH_TIMEOUT=15000 # Timeout para extrair conteúdo
```

### User Agent

Configure o User Agent usado nas requisições HTTP:

```bash
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique se a variável `SUPABASE_JWT_SECRET` está configurada corretamente
2. Confirme que o token JWT não expirou
3. Verifique os logs da aplicação para mais detalhes

## 🔗 Links Úteis

- [Documentação do NestJS](https://docs.nestjs.com/)
- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do Passport JWT](http://www.passportjs.org/packages/passport-jwt/)
- [Mozilla Readability](https://github.com/mozilla/readability)
