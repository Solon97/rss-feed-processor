# Docker Setup para RSS Feed Processor

Este documento explica como usar Docker para executar a aplicação RSS Feed Processor com Redis para o sistema de filas.

## Pré-requisitos

- Docker
- Docker Compose
- Arquivo `.env` configurado (copie de `.env.example`)

## Arquivos Docker

### `docker-compose.yml`
Configuração completa para produção com:
- Redis para filas BullMQ
- Redis Commander (opcional)
- Aplicação RSS Feed Processor

### `docker-compose.dev.yml`
Configuração simplificada para desenvolvimento com:
- Redis local
- Redis Commander para monitoramento

### `Dockerfile`
Multi-stage build otimizado:
- **Development**: Hot-reload e dependências de dev
- **Build**: Compilação da aplicação
- **Production**: Imagem otimizada para produção

## Comandos Disponíveis

### Desenvolvimento

```bash
# Iniciar Redis para desenvolvimento local
npm run docker:dev:start

# Parar ambiente de desenvolvimento
npm run docker:dev:stop

# Monitorar filas em tempo real
npm run docker:monitor
```

### Produção

```bash
# Build e deploy completo
npm run docker:prod:deploy

# Parar produção
npm run docker:prod:stop

# Build apenas as imagens
npm run docker:build

# Ver logs
npm run docker:logs

# Limpeza completa
npm run docker:clean
```

## Fluxo de Trabalho

### 1. Desenvolvimento Local

```bash
# 1. Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações

# 2. Iniciar Redis
npm run docker:dev:start

# 3. Executar aplicação localmente
npm run start:dev

# 4. Monitorar filas (terminal separado)
npm run docker:monitor
```

### 2. Deploy de Produção

```bash
# 1. Configurar .env para produção
cp .env.example .env
# Configurar DATABASE_URL, SUPABASE_*, etc.

# 2. Deploy completo
npm run docker:prod:deploy

# 3. Verificar status
docker-compose ps
```

## Serviços Disponíveis

### Redis
- **Porta**: 6379
- **Configuração**: `docker/redis/redis.conf`
- **Dados**: Volume persistente `redis_data`

### Redis Commander
- **URL**: http://localhost:8081
- **Usuário**: admin
- **Senha**: admin
- **Descrição**: Interface web para monitorar Redis

### Aplicação
- **URL**: http://localhost:3000 (ou PORT definido em .env)
- **Health Check**: `/health`
- **API**: Endpoints da aplicação

## Configuração de Ambiente

### Variáveis Obrigatórias

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Redis (automático no Docker)
REDIS_URL=redis://redis:6379/0
```

### Variáveis Opcionais

```env
# Security
REDIS_PASSWORD=strong_password_here

# Performance
QUEUE_CONCURRENCY=5
MAX_FEED_ITEMS_TO_PROCESS=10

# Monitoring
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=secure_password
```

## Volumes Persistentes

### `redis_data`
- **Localização**: Dados do Redis
- **Backup**: `docker run --rm -v redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .`
- **Restore**: `docker run --rm -v redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data`

### `logs`
- **Localização**: Logs da aplicação
- **Acesso**: `docker-compose exec app ls -la /app/logs`

## Monitoramento

### Logs em Tempo Real

```bash
# Todos os serviços
docker-compose logs -f

# Apenas aplicação
docker-compose logs -f app

# Apenas Redis
docker-compose logs -f redis
```

### Estatísticas de Filas

```bash
# Script automático
npm run docker:monitor

# Manual via Redis CLI
docker-compose exec redis redis-cli
> LLEN bull:feed-processing:waiting
> LLEN bull:feed-processing:active
> ZCARD bull:feed-processing:completed
> ZCARD bull:feed-processing:failed
```

### Health Checks

```bash
# Status geral
docker-compose ps

# Health check da aplicação
curl http://localhost:3000/health

# Redis ping
docker-compose exec redis redis-cli ping
```

## Troubleshooting

### Redis não conecta
```bash
# Verificar se Redis está rodando
docker-compose ps redis

# Verificar logs do Redis
docker-compose logs redis

# Testar conexão
docker-compose exec redis redis-cli ping
```

### Aplicação não inicia
```bash
# Verificar logs
docker-compose logs app

# Verificar variáveis de ambiente
docker-compose exec app env | grep -E "(DATABASE|REDIS|SUPABASE)"

# Rebuild da imagem
docker-compose build --no-cache app
```

### Performance Issues
```bash
# Verificar uso de memória
docker stats

# Verificar filas congestionadas
npm run docker:monitor

# Limpar jobs falhados
curl -X DELETE http://localhost:3000/queue/failed-jobs
```

## Profiles Docker Compose

### Profile `app`
Inclui a aplicação completa (usar em produção)

```bash
docker-compose --profile app up -d
```

### Profile `tools`
Inclui ferramentas de desenvolvimento (Redis Commander)

```bash
docker-compose --profile tools up -d
```

### Sem Profile
Apenas Redis (desenvolvimento local)

```bash
docker-compose up -d
```

## Segurança

### Produção
- Configure `REDIS_PASSWORD`
- Use `REDIS_COMMANDER_PASSWORD` forte
- Configure firewall para portas expostas
- Use HTTPS em produção

### Desenvolvimento
- Redis sem senha (apenas local)
- Redis Commander com credenciais padrão
- Todas as portas expostas localmente
