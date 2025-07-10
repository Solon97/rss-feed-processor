# Autenticação do QStash Scheduler

## Visão Geral

O endpoint `/queue/schedule-all` agora utiliza uma autenticação personalizada para validar requisições vindas do scheduler do QStash. Esta implementação segue os princípios SOLID e garante que apenas requisições autorizadas possam agendar o processamento de feeds.

## Como Funciona

### Variável de Ambiente

Adicione a seguinte variável no seu arquivo `.env`:

```env
QSTASH_SCHEDULE_ID=seu_schedule_id_unico_aqui
```

**Importante**: Este valor deve ser mantido em segredo e deve corresponder ao header enviado pelo QStash.

### Header de Autenticação

O QStash scheduler deve enviar o header:

```
Upstash-Schedule-Id: seu_schedule_id_unico_aqui
```

### Implementação

1. **QStashSchedulerGuard**: Guard personalizado que valida o header `Upstash-Schedule-Id`
2. **Configuração no Endpoint**: O endpoint `POST /queue/schedule-all` usa o `@UseGuards(QStashSchedulerGuard)`
3. **Validação de Ambiente**: A variável `QSTASH_SCHEDULE_ID` é validada na inicialização da aplicação

## Exemplo de Uso

### Configuração no QStash

Ao criar um schedule no QStash, adicione o header personalizado:

```typescript
// Exemplo de configuração do schedule
await qstashClient.schedules.create({
  destination: "https://your-app.com/queue/schedule-all",
  cron: "0 */6 * * *", // A cada 6 horas
  headers: {
    "Upstash-Schedule-Id": process.env.QSTASH_SCHEDULE_ID,
    "Content-Type": "application/json"
  }
});
```

### Requisição Manual para Teste

```bash
curl -X POST https://your-app.com/queue/schedule-all \
  -H "Upstash-Schedule-Id: seu_schedule_id_unico_aqui" \
  -H "Content-Type: application/json"
```

## Segurança

- **Princípio da Responsabilidade Única**: O guard tem apenas uma responsabilidade - validar autenticação do scheduler
- **Fail-Safe**: Se o header ou variável de ambiente estiver ausente, a requisição é rejeitada
- **Logging**: Todas as tentativas de autenticação são logadas para auditoria
- **Separação de Concerns**: Autenticação do scheduler é independente da autenticação de usuários

## Erros Possíveis

| Erro | Causa | Solução |
|------|-------|---------|
| `Missing scheduler authentication header` | Header `Upstash-Schedule-Id` não enviado | Verificar configuração do QStash |
| `Scheduler authentication not configured` | Variável `QSTASH_SCHEDULE_ID` não definida | Adicionar variável no `.env` |
| `Invalid scheduler authentication` | Header não confere com a variável | Verificar se os valores são idênticos |

## Monitoramento

O guard registra logs em diferentes níveis:

- **DEBUG**: Autenticação bem-sucedida
- **WARN**: Header ausente ou inválido
- **ERROR**: Configuração ausente

Monitore estes logs para detectar tentativas de acesso não autorizado.
