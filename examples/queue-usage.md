# Exemplo de Uso do Sistema de Filas

## 1. Adicionando um Feed Manualmente à Fila

```typescript
import { FeedQueueService } from './queue/services/feed-queue.service';

// Injetar o serviço no constructor
constructor(private readonly feedQueueService: FeedQueueService) {}

// Adicionar feed à fila regular (com prioridade baseada em usuários)
await this.feedQueueService.addFeedToQueue(feedId, feedUrl);

// Adicionar feed recém-criado à fila prioritária
await this.feedQueueService.addNewFeedToPriorityQueue(feedId, feedUrl);
```

## 2. Agendando Processamento de Todos os Feeds

```typescript
// Processar todos os feeds ativos por ordem de prioridade
await this.feedQueueService.scheduleAllFeedsProcessing();
```

## 3. Monitorando Estatísticas das Filas

```typescript
import { QueueHealthService } from './queue/services/queue-health.service';

// Obter estatísticas das filas
const stats = await this.feedQueueService.getQueueStats();
console.log('Filas:', stats);

// Verificar saúde das filas  
const health = await this.queueHealthService.getHealthStatus();
console.log('Status:', health.status); // 'healthy', 'degraded', 'unhealthy'
```

## 4. Exemplo de Response do Job Processing

```typescript
// Resultado do processamento de um feed
interface FeedItemProcessingResult {
  feedId: string;
  processedItems: number;  // Total de items processados
  newItems: number;        // Items novos adicionados
  errors: string[];        // Erros encontrados
}

// Exemplo de resultado
{
  "feedId": "uuid-do-feed",
  "processedItems": 10,
  "newItems": 3,
  "errors": [
    "Failed to extract content for: https://example.com/post1"
  ]
}
```

## 5. Configuração de Prioridades

```typescript
// Sistema automático de prioridades baseado em usuários ativos:

// ≥ 100 usuários ativos → ALTA prioridade (10)
// 10-99 usuários ativos → MÉDIA prioridade (5)  
// < 10 usuários ativos → BAIXA prioridade (1)

// As prioridades são calculadas automaticamente pelo sistema
```

## 6. Testando o Sistema

```bash
# Agendar processamento manual via API
curl -X POST http://localhost:3000/queue/schedule-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verificar estatísticas
curl -X GET http://localhost:3000/queue/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verificar saúde das filas
curl -X GET http://localhost:3000/queue/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Limpar jobs falhados
curl -X DELETE http://localhost:3000/queue/failed-jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 7. Logs para Monitoramento

```bash
# O sistema gera logs detalhados:

# Processamento de feed iniciado
[FeedProcessingProcessor] Processing feed uuid-123 (25 users) - Job 456

# Resultado do processamento  
[FeedProcessingProcessor] Completed processing feed uuid-123 in 2340ms - 3/10 new items

# Agendamento automático (cron)
[FeedSchedulerService] Starting scheduled feeds processing...
[FeedSchedulerService] Successfully scheduled 45 feeds for processing

# Estatísticas de saúde
[FeedSchedulerService] Queue Statistics: {
  "processing": { "waiting": 12, "active": 3, "completed": 1250, "failed": 2 },
  "priority": { "waiting": 0, "active": 1, "completed": 45, "failed": 0 }
}
```

## 8. Integração com Novos Feeds

```typescript
// O sistema se integra automaticamente quando feeds são criados:

// 1. Feed é validado e criado no banco
const feed = await this.feedSubscription.createFeedRecord(feedData);

// 2. Feed é automaticamente adicionado à fila prioritária
// (isso acontece dentro do createFeedRecord)

// 3. Processamento imediato dos items mais recentes
```

## 9. Personalização de Configurações

```typescript
// As configurações podem ser ajustadas no QueueModule:

// Número de tentativas
attempts: 3

// Backoff exponencial  
backoff: { type: 'exponential', delay: 2000 }

// Retenção de jobs
removeOnComplete: 10  // manter 10 jobs completos
removeOnFail: 5       // manter 5 jobs falhados

// Timeout personalizado por job
timeout: 30000  // 30 segundos
```
