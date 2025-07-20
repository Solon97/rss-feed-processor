# Integração com Stripe

Este módulo implementa uma integração simplificada com o Stripe focada em:
- Consulta de preços
- Processamento de webhooks para eventos de assinatura

## Configuração

### Variáveis de Ambiente

```bash
# Chave secreta do Stripe (obtenha no dashboard do Stripe)
STRIPE_SECRET_KEY=sk_test_...your_stripe_secret_key...

# Secret do webhook (obtenha ao configurar o webhook no Stripe)
STRIPE_WEBHOOK_SECRET=whsec_...your_webhook_endpoint_secret...
```

### Configuração do Webhook no Stripe

1. Acesse o dashboard do Stripe
2. Vá em "Developers" > "Webhooks"
3. Clique em "Add endpoint"
4. Configure a URL: `https://your-domain.com/stripe/webhooks`
5. Selecione os eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Endpoints Disponíveis

### Consulta de Preços

- `GET /stripe/prices` - Lista todos os preços
  - Query params:
    - `product` - ID do produto para filtrar
    - `active` - true/false para filtrar preços ativos
    - `limit` - número máximo de resultados

- `GET /stripe/prices/:id` - Obter preço específico

### Webhook

- `POST /stripe/webhooks` - Endpoint para receber eventos do Stripe

## Eventos Processados

### customer.subscription.created / updated
- Cria ou atualiza registro na tabela `user_subscriptions`
- Requer `user_id` nos metadados da assinatura no Stripe

### customer.subscription.deleted
- Atualiza status da assinatura para "canceled"

### invoice.payment_succeeded
- Atualiza status da assinatura para "active"

### invoice.payment_failed
- Atualiza status da assinatura para "past_due"

## Banco de Dados

A tabela `user_subscriptions` é utilizada para gerenciar as assinaturas:

```sql
-- Campos principais:
- user_id (UUID do usuário)
- stripe_subscription_id (ID da assinatura no Stripe)
- stripe_customer_id (ID do cliente no Stripe)
- status (status da assinatura)
- current_period_start/end (período atual da assinatura)
```

## Uso nos Serviços

```typescript
// Verificar se usuário tem assinatura ativa
const hasSubscription = await subscriptionService.hasActiveSubscription(userId);

// Obter assinatura do usuário
const subscription = await subscriptionService.getUserSubscription(userId);

// Consultar preços do Stripe
const prices = await stripeService.getPrices({ active: true });
```
