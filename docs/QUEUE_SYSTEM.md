# Sistema de Filas para Processamento de Feeds

Este sistema implementa um processamento distribuído de feeds RSS usando BullMQ, organizando feeds por prioridade baseada no número de usuários ativos.

## Características Principais

### 1. Filas Priorizadas
- **Fila de Processamento Regular** (`feed-processing`): Processa feeds existentes
- **Fila Prioritária** (`feed-priority`): Processa feeds recém-criados imediatamente

### 2. Sistema de Prioridades
- **Alta Prioridade** (10): Feeds com 100+ usuários ativos
- **Média Prioridade** (5): Feeds com 10-99 usuários ativos  
- **Baixa Prioridade** (1): Feeds com <10 usuários ativos

### 3. Processamento Inteligente
- Processa apenas os **10 itens mais recentes** de cada feed
- Evita duplicação verificando se itens já foram processados
- Extrai conteúdo completo e thumbnails automaticamente
- Sistema de retry com backoff exponencial

## Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Feed Criado   │───▶│  Fila Prioritária │───▶│ Processamento   │
└─────────────────┘    │   (Imediato)     │    │   Imediato      │
                       └──────────────────┘    └─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Feeds Ativos   │───▶│ Fila Regular     │───▶│ Processamento   │
│  (por prioridade)│    │ (Por prioridade) │    │  Escalonado     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Componentes

### Services

#### `FeedQueueService`
- Adiciona feeds às filas com prioridade apropriada
- Calcula prioridade baseado no número de usuários ativos
- Agenda processamento de todos os feeds
- Fornece estatísticas das filas

#### `FeedSchedulerService`
- Agenda processamento automático a cada 30 minutos
- Monitora estatísticas das filas de hora em hora
- Usa cron jobs para automação

#### `QueueHealthService`
- Monitora saúde das filas
- Calcula métricas de falha
- Limpa jobs falhados
- Fornece status de saúde geral

### Processors

#### `FeedProcessingProcessor`
- Processa feeds da fila regular
- Atualiza timestamp de última busca
- Extrai conteúdo dos 10 itens mais recentes
- Evita duplicações

#### `FeedPriorityProcessor`
- Processa feeds recém-criados com alta prioridade
- Reutiliza lógica do processor regular

## API Endpoints

### `GET /queue/stats`
Retorna estatísticas das filas:
```json
{
  "processing": {
    "waiting": 15,
    "active": 2,
    "completed": 1250,
    "failed": 5
  },
  "priority": {
    "waiting": 0,
    "active": 1,
    "completed": 45,
    "failed": 0
  }
}
```

### `GET /queue/health`
Retorna status de saúde das filas:
```json
{
  "status": "healthy",
  "queues": {
    "processing": {
      "name": "Processing",
      "status": "healthy",
      "metrics": {
        "waiting": 15,
        "active": 2,
        "failureRate": 2
      }
    },
    "priority": {
      "name": "Priority", 
      "status": "healthy",
      "metrics": {
        "waiting": 0,
        "active": 1,
        "failureRate": 0
      }
    }
  }
}
```

### `POST /queue/schedule-all`
Agenda todos os feeds ativos para processamento imediato.

### `DELETE /queue/failed-jobs`
Remove todos os jobs falhados das filas.

## Configuração

### Variáveis de Ambiente

```env
# Redis (obrigatório)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Configuração de Jobs

- **Tentativas**: 3 com backoff exponencial
- **Retenção**: 10 jobs completos, 5 falhados
- **Timeout**: Configurável por job

## Fluxo de Funcionamento

### 1. Criação de Feed
```
Feed Criado → FeedSubscriptionService → FeedQueueService → Fila Prioritária
```

### 2. Processamento Regular
```
Cron (30min) → FeedSchedulerService → FeedQueueService → Fila Regular
```

### 3. Processamento de Items
```
Job Iniciado → Parser RSS → 10 Items Recentes → Verificação Duplicados → Extração Conteúdo → Salvamento BD
```

## Monitoramento

### Logs
- Início e fim de processamento de cada feed
- Estatísticas de items processados vs novos
- Erros de processamento individual
- Status de saúde das filas

### Métricas
- Taxa de falha por fila
- Tempo médio de processamento  
- Throughput de jobs
- Número de usuarios por feed

## Benefícios

1. **Escalabilidade**: Processamento distribuído e paralelo
2. **Priorização**: Feeds com mais usuários são processados primeiro
3. **Eficiência**: Apenas 10 items mais recentes, evita duplicação
4. **Confiabilidade**: Sistema de retry e monitoramento de saúde
5. **Observabilidade**: Logs detalhados e métricas de performance

## Uso

O sistema é iniciado automaticamente com a aplicação. Feeds novos são automaticamente adicionados à fila prioritária, e o processamento regular ocorre a cada 30 minutos via cron job.
