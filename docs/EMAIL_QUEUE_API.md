# Email Queue API Documentation

## Endpoint: POST /webhook/email

Este endpoint permite processar emails através da fila de processamento usando templates predefinidos.

### Headers Obrigatórios

```
Content-Type: application/json
upstash-signature: <signature> (apenas em produção)
```

### Body da Requisição

```typescript
{
  template: EmailTemplateType; // 'welcome' | 'email-confirmation'
  variables: Record<string, any>; // Variáveis para renderizar o template
  to: string; // Email do destinatário
  toName?: string; // Nome do destinatário (opcional)
  from?: string; // Email do remetente (opcional, usa default do sistema)
  subject?: string; // Assunto do email (opcional, usa default do template)
}
```

### Exemplos de Uso

#### 1. Email de Boas-vindas

```json
{
  "template": "welcome",
  "variables": {
    "userName": "João Silva"
  },
  "to": "joao@exemplo.com",
  "toName": "João Silva"
}
```

#### 2. Email de Confirmação

```json
{
  "template": "email-confirmation",
  "variables": {
    "userName": "Maria Santos",
    "confirmationUrl": "https://feedagg.com/confirm?token=abc123",
    "supportEmail": "support@feedagg.com"
  },
  "to": "maria@exemplo.com",
  "toName": "Maria Santos"
}
```

#### 3. Email Personalizado

```json
{
  "template": "custom-template",
  "variables": {
    "customerName": "Pedro Costa",
    "orderNumber": "12345",
    "totalAmount": "R$ 99,90"
  },
  "to": "pedro@exemplo.com",
  "toName": "Pedro Costa",
  "subject": "Confirmação do Pedido #12345"
}
```

### Resposta de Sucesso

```json
{
  "success": true,
  "result": {
    "emailId": "email_12345",
    "success": true,
    "message": "Email sent successfully"
  }
}
```

### Resposta de Erro

```json
{
  "success": false,
  "error": "BadRequestException",
  "message": "Invalid signature"
}
```

### Códigos de Status

- `200`: Email processado com sucesso
- `400`: Dados inválidos ou assinatura inválida
- `500`: Erro interno do servidor

### Validações

- `template`: Deve ser um dos valores válidos do enum `EmailTemplateType`
- `variables`: Objeto contendo as variáveis necessárias para o template
- `to`: Deve ser um email válido
- `toName`: String opcional para o nome do destinatário
- `from`: Email válido opcional para o remetente
- `subject`: String opcional para o assunto personalizado

### Notas Importantes

1. Em ambiente de produção, o endpoint valida a assinatura do QStash
2. Para templates específicos como `email-confirmation`, certas variáveis são obrigatórias (ex: `confirmationUrl`)
3. Se o template não for reconhecido, o sistema utilizará o método genérico de envio
4. O sistema automaticamente utiliza o serviço de template configurado para renderizar o email
