# Stripe Module Configuration

## Overview
Este módulo fornece integração completa com a API do Stripe, incluindo:
- Gerenciamento de clientes
- Processamento de assinaturas
- Webhook handling com verificação de segurança
- Sessões de checkout
- Portal do cliente

## Environment Variables Required
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## API Version
Configurado para usar a versão `2024-12-18.acacia` da API do Stripe.

## Webhook Events Supported
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.resumed`
- `customer.subscription.paused`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice_payment.paid`

## Services

### SubscriptionService
- `upsertUserSubscription()` - Cria ou atualiza assinatura
- `cancelUserSubscription()` - Cancela assinatura
- `getActiveSubscription()` - Busca assinatura ativa

### CustomerService  
- `getOrCreateCustomer()` - Obtém ou cria cliente no Stripe
- Integração com tabela `stripe_customers` do Prisma

### CheckoutService
- `createCheckoutSession()` - Cria sessão de checkout
- `createPortalSession()` - Cria sessão do portal do cliente

### WebhookService
- `processWebhookEvent()` - Processa eventos do webhook
- Validação de assinatura automática
- Log estruturado de eventos

## Types and Interfaces

### Custom Interfaces
- `StripeCustomerData` - Interface para dados do cliente Stripe

### Stripe SDK Types
O módulo utiliza diretamente os tipos do SDK oficial do Stripe para maior precisão:
- `Stripe.Event` - Para eventos de webhook
- `Stripe.Subscription` - Para dados de assinatura  
- `Stripe.Invoice` - Para dados de fatura
- `Stripe.Customer` - Para dados do cliente
- `Stripe.Checkout.Session` - Para sessões de checkout

## Security Features
- Raw body middleware para verificação de webhook
- Validação de assinatura do Stripe
- Error handling robusto
- Logging estruturado

## Usage Example

```typescript
// Criar sessão de checkout
const session = await this.checkoutService.createCheckoutSession(
  user,
  'price_1234567890',
  'https://example.com/success',
  'https://example.com/cancel'
);

// Processar webhook
app.post('/stripe/webhooks', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  await this.webhookService.processWebhookEvent(req.body);
  res.json({ received: true });
});
```

## Database Integration
Uses Prisma with the following tables:
- `stripe_customers` - Maps users to Stripe customer IDs
- `subscriptions` - Stores subscription data

## Testing
Para testar webhooks localmente:
```bash
stripe listen --forward-to localhost:3000/stripe/webhooks
```
