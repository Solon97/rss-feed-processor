# Migração para REDIS_URL

Este documento descreve a migração das variáveis de ambiente Redis separadas para uma única variável `REDIS_URL`.

## Motivação

Para facilitar o deploy da aplicação, especialmente em plataformas cloud, foi implementado o suporte à variável de ambiente `REDIS_URL` que contém a URL completa de conexão com o Redis.

## Mudanças

### Antes (Deprecado)

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=mypassword
REDIS_DB=0
```

### Depois (Recomendado)

```env
REDIS_URL=redis://mypassword@localhost:6379/0
```

## Formatos de URL Suportados

### Redis sem autenticação
```
redis://localhost:6379/0
```

### Redis com senha
```
redis://password@localhost:6379/0
```

### Redis com usuário e senha
```
redis://username:password@localhost:6379/0
```

### Redis com SSL/TLS
```
rediss://password@localhost:6380/0
```

## Compatibilidade

A aplicação mantém **compatibilidade total** com as variáveis separadas. Se `REDIS_URL` não estiver definida, a aplicação usará automaticamente as variáveis individuais:

- `REDIS_HOST` (padrão: localhost)
- `REDIS_PORT` (padrão: 6379)
- `REDIS_PASSWORD` (opcional)
- `REDIS_DB` (padrão: 0)

## Migração

### Desenvolvimento Local

1. Atualize seu arquivo `.env`:
   ```env
   # Nova configuração (recomendada)
   REDIS_URL=redis://localhost:6379/0
   
   # Remova as configurações antigas
   # REDIS_HOST=localhost
   # REDIS_PORT=6379
   # REDIS_PASSWORD=
   # REDIS_DB=0
   ```

### Docker Compose

O arquivo `docker-compose.yml` foi atualizado para usar `REDIS_URL` por padrão:

```yaml
environment:
  - REDIS_URL=${REDIS_URL:-redis://redis:6379/0}
```

### Produção

Para ambientes de produção, defina a variável `REDIS_URL` com a URL completa do seu provedor Redis:

```env
# Exemplo com Redis Cloud
REDIS_URL=redis://username:password@redis-instance.cloud.redislabs.com:12345/0

# Exemplo com AWS ElastiCache
REDIS_URL=redis://my-cluster.abc123.cache.amazonaws.com:6379/0

# Exemplo com Upstash
REDIS_URL=redis://default:password@global-lovely-12345.upstash.io:6379/0
```

## Benefícios

1. **Configuração Simplificada**: Uma única variável em vez de quatro
2. **Compatibilidade com Provedores Cloud**: Maioria dos provedores Redis fornecem URLs completas
3. **Deploy Mais Fácil**: Menos variáveis para configurar em produção
4. **Padrão da Indústria**: Formato padrão usado por bibliotecas Redis

## Rollback

Caso precise voltar às configurações antigas, simplesmente:

1. Remova a variável `REDIS_URL`
2. Configure as variáveis individuais:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   ```

A aplicação detectará automaticamente e usará as configurações individuais.

## Validação

Para validar se a configuração está funcionando:

1. Inicie a aplicação
2. Verifique os logs para confirmar a conexão com Redis
3. Teste as funcionalidades de fila
4. Use o Redis Commander em desenvolvimento: http://localhost:8081

## Suporte

Se encontrar problemas durante a migração:

1. Verifique se a URL do Redis está no formato correto
2. Confirme se o Redis está acessível na URL especificada
3. Teste a conexão usando redis-cli: `redis-cli -u "redis://localhost:6379/0"`
4. Verifique os logs da aplicação para erros de conexão
