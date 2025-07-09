# 🚀 Quick Start - Sistema de Filas com Docker

Este guia rápido te ajuda a executar o RSS Feed Processor com sistema de filas Redis usando Docker.

## ⚡ Início Rápido

### 1. Configuração Inicial

```bash
# Clone e navegue para o projeto
cd rss-feed-processor

# Copie e configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações (DATABASE_URL, SUPABASE_*, etc.)

# Valide se tudo está funcionando
npm run docker:validate
```

### 2. Desenvolvimento

```bash
# Inicie Redis para desenvolvimento
npm run docker:dev:start

# Em outro terminal, inicie a aplicação
npm run start:dev

# Em outro terminal, monitore as filas
npm run docker:monitor
```

### 3. Produção

```bash
# Configure .env para produção
# Depois execute deploy completo
npm run docker:prod:deploy
```

## 🔧 Comandos Essenciais

| Comando | Descrição |
|---------|-----------|
| `npm run docker:dev:start` | Inicia Redis para desenvolvimento |
| `npm run docker:dev:stop` | Para ambiente de desenvolvimento |
| `npm run docker:monitor` | Monitora filas em tempo real |
| `npm run docker:prod:deploy` | Deploy completo para produção |
| `npm run docker:validate` | Valida configuração Docker |

## 🌐 Acessos

- **Aplicação**: http://localhost:3000
- **Redis Commander**: http://localhost:8081 (admin/admin)
- **API Filas**: http://localhost:3000/queue/stats

## 📊 Sistema de Filas

### Funcionamento Automático

1. **Feed Criado** → Fila Prioritária → Processamento Imediato
2. **Feeds Existentes** → Cron (30min) → Processamento por Prioridade
3. **Prioridade** baseada em número de usuários ativos

### Monitoramento

```bash
# Via API
curl http://localhost:3000/queue/stats
curl http://localhost:3000/queue/health

# Via Script
npm run docker:monitor

# Agendar processamento manual
curl -X POST http://localhost:3000/queue/schedule-all
```

## 🛠️ Troubleshooting

### Redis não conecta
```bash
docker-compose ps redis
npm run docker:validate
```

### Filas travadas
```bash
npm run docker:monitor
curl -X DELETE http://localhost:3000/queue/failed-jobs
```

### Reset completo
```bash
npm run docker:clean
npm run docker:dev:start
```

## 📚 Documentação Completa

- [Sistema de Filas](./docs/QUEUE_SYSTEM.md)
- [Configuração Docker](./docs/DOCKER_SETUP.md)
- [Exemplos de Uso](./examples/queue-usage.md)

## ✅ Checklist de Deploy

- [ ] Arquivo `.env` configurado
- [ ] `DATABASE_URL` correto
- [ ] `SUPABASE_*` configurado
- [ ] Redis funcionando (`npm run docker:validate`)
- [ ] Aplicação conectando (`npm run start:dev`)
- [ ] Filas processando (`npm run docker:monitor`)

Pronto! Seu sistema de filas está funcionando! 🎉
