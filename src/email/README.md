# Email Service Documentation

## Configuração do Resend

O serviço de email da aplicação utiliza o Resend como provedor de email. O Resend é uma plataforma moderna de envio de emails com alta entregabilidade e APIs simples.

### Configuração Necessária

#### 1. Criar conta no Resend
1. Acesse [resend.com](https://resend.com)
2. Crie uma conta gratuita
3. Verifique seu email

#### 2. Obter API Key
1. No dashboard do Resend, vá para **API Keys**
2. Clique em **Create API Key**
3. Dê um nome para a chave (ex: "RSS Feed Processor")
4. Selecione as permissões adequadas
5. Copie a chave gerada (começa com `re_`)

#### 3. Configurar Domínio (Produção)
Para produção, é recomendado usar seu próprio domínio:
1. No dashboard do Resend, vá para **Domains**
2. Clique em **Add Domain**
3. Adicione seu domínio (ex: `seudominio.com`)
4. Configure os registros DNS conforme instruído
5. Aguarde a verificação

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@seudominio.com  # ou onboarding@resend.dev para testes
FRONTEND_URL=http://localhost:3000  # URL do frontend para links em emails
```

### Logo Configuration

The email templates use the actual FeedAgg logo for better branding:

#### Setup Requirements
- **Logo Location**: The logo must be available at `/public/feedagg-logo.png`
- **Static File Serving**: Your NestJS application must serve static files from the `public` directory
- **Frontend URL**: Set `FRONTEND_URL` to your application's base URL

#### How It Works
1. The email template tries to load the logo from `{FRONTEND_URL}/feedagg-logo.png`
2. If the logo fails to load, it falls back to an SVG funnel icon
3. The logo is automatically sized and styled to fit the email header

#### Static File Configuration
The application is configured to serve static files. The logo will be accessible at:
- **Development**: `http://localhost:3001/feedagg-logo.png`
- **Production**: `https://yourdomain.com/feedagg-logo.png`

### Uso do Serviço

#### Injeção de Dependência

```typescript
import { EmailService } from './email/email.service';

@Injectable()
export class YourService {
  constructor(private readonly emailService: EmailService) {}
}
```

#### Envio de Email de Boas-vindas

```typescript
await this.emailService.sendWelcomeEmail(
  'user@example.com',
  'Nome do Usuário' // opcional
);
```

#### Envio de Email de Reset de Senha

```typescript
await this.emailService.sendPasswordResetEmail(
  'user@example.com',
  'reset_token_here',
  'Nome do Usuário' // opcional
);
```

#### Envio de Email de Confirmação de Assinatura

```typescript
await this.emailService.sendSubscriptionConfirmationEmail(
  'user@example.com',
  'Plano Premium',
  'Nome do Usuário' // opcional
);
```

#### Envio de Email Customizado

```typescript
import { SendEmailRequest } from './email/interfaces/email.interface';

const emailRequest: SendEmailRequest = {
  from: 'noreply@seudominio.com',
  to: ['user@example.com'],
  subject: 'Assunto do Email',
  html: '<h1>Conteúdo HTML</h1>',
  text: 'Conteúdo em texto simples',
};

const result = await this.emailService.sendEmail(emailRequest);
```

### API Endpoints

#### Health Check
```
GET /email/health
```
Verifica se o serviço de email está funcionando corretamente.

#### Envio de Email Genérico
```
POST /email/send
```
Body:
```json
{
  "from": "noreply@seudominio.com",
  "to": ["user@example.com"],
  "subject": "Assunto",
  "html": "<p>Conteúdo HTML</p>",
  "text": "Conteúdo em texto"
}
```

#### Envio de Email de Boas-vindas
```
POST /email/welcome
```
Body:
```json
{
  "email": "user@example.com",
  "name": "Nome do Usuário"
}
```

### Estrutura de Arquivos

```
src/email/
├── dto/
│   └── send-email.dto.ts          # DTOs para validação
├── interfaces/
│   └── email.interface.ts         # Interfaces e tipos
├── templates/                     # Templates de email (futuro)
├── email.controller.ts            # Controller para endpoints
├── email.module.ts               # Módulo do serviço
├── email.service.ts              # Serviço principal
└── resend-email.provider.ts      # Provider específico do Resend
```

### Monitoramento e Logs

O serviço inclui logs detalhados para monitoramento:
- ✅ Emails enviados com sucesso
- ❌ Falhas no envio
- 🔍 Validação de configuração
- 📊 Estatísticas de uso

### Tratamento de Erros

O serviço retorna objetos `EmailSendResult` com:
```typescript
interface EmailSendResult {
  id: string;        // ID do email no Resend
  success: boolean;  // Status do envio
  message?: string;  // Mensagem de erro (se houver)
}
```

### Limitações do Plano Gratuito

O plano gratuito do Resend inclui:
- 3.000 emails por mês
- 100 emails por dia
- Todos os recursos básicos

Para mais emails, considere upgrader para um plano pago.

### Troubleshooting

#### 1. Email não está sendo enviado
- Verifique se `RESEND_API_KEY` está configurada corretamente
- Verifique se `RESEND_FROM_EMAIL` usa um domínio verificado
- Consulte os logs da aplicação para erros específicos

#### 2. Emails indo para spam
- Configure SPF, DKIM e DMARC no seu domínio
- Use um domínio próprio ao invés de `resend.dev`
- Evite conteúdo que pareça spam

#### 3. API Key inválida
- Verifique se a chave não expirou
- Confirme que copiou a chave completa
- Gere uma nova chave se necessário

### Extensibilidade

O serviço foi projetado para ser extensível. Para adicionar novos provedores de email:

1. Implemente a interface `EmailProvider`
2. Crie um novo provider (ex: `sendgrid-email.provider.ts`)
3. Atualize o `EmailService` para usar o novo provider

### Segurança

- ✅ API keys são mantidas em variáveis de ambiente
- ✅ Validação de entrada nos DTOs
- ✅ Rate limiting recomendado (não implementado)
- ✅ Logs não expõem informações sensíveis
