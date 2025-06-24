# Refatoração: Sistema Unificado de Guards

## Problema Identificado

Você estava certo em questionar a necessidade de dois guards separados. A implementação inicial violava alguns princípios SOLID:

### **Problemas da Abordagem Anterior:**

1. **Violação do SRP (Single Responsibility Principle)**
   - `SupabaseJwtAuthGuard`: Validava apenas access tokens
   - `RefreshTokenGuard`: Duplicava lógica de validação para refresh tokens

2. **Duplicação de Código**
   - Ambos faziam validação de tokens
   - Tratamento de erros similar em ambos
   - Extração de tokens com lógicas diferentes

3. **Complexidade Desnecessária**
   - Duas formas de fazer autenticação
   - Diferentes padrões de uso
   - Manutenção de dois sistemas

## Solução: Guard Unificado

### **Novo Desenho:**

```typescript
UnifiedAuthGuard
├── TokenType.ACCESS (padrão)
├── TokenType.REFRESH  
├── Validation Logic Unificada
├── Error Handling Consistente
└── Extração de Tokens Flexível
```

### **Princípios SOLID Aplicados:**

✅ **SRP**: Um guard com responsabilidade clara de autenticação  
✅ **OCP**: Extensível via TokenType sem modificar código existente  
✅ **LSP**: Substitui perfeitamente os guards anteriores  
✅ **ISP**: Interface limpa e específica  
✅ **DIP**: Depende de abstrações (AuthService)  

## Comparação: Antes vs Depois

### **ANTES (Problemático):**

```typescript
// Para access tokens
@UseGuards(SupabaseJwtAuthGuard)
async getProfile() { }

// Para refresh tokens
@UseGuards(RefreshTokenGuard)
async refreshToken(@Body() dto: RefreshTokenDto) { }
```

### **DEPOIS (Limpo):**

```typescript
// Para access tokens
@Authenticated()
async getProfile() { }

// Para refresh tokens  
@RequireRefreshToken()
async refreshToken(@RefreshToken() token: string) { }
```

## Benefícios da Refatoração

### **1. Código Mais Limpo**
- Decorators semânticos (`@Authenticated()`)
- Menos imports necessários
- Sintaxe mais intuitiva

### **2. Manutenção Simplificada**
- Lógica centralizada em um lugar
- Tratamento de erro consistente
- Configuração unificada

### **3. Melhor Developer Experience**
- IntelliSense mais preciso
- Menos configuração boilerplate
- Padrão consistente em toda aplicação

### **4. Extensibilidade**
- Fácil adicionar novos tipos de token
- Configuração flexível por contexto
- Reutilização em diferentes módulos

## Migração dos Guards Existentes

### **SupabaseJwtAuthGuard → UnifiedAuthGuard(ACCESS)**
```typescript
// Antes
@UseGuards(SupabaseJwtAuthGuard)

// Depois
@Authenticated() // ou @RequireAccessToken()
```

### **RefreshTokenGuard → UnifiedAuthGuard(REFRESH)**
```typescript
// Antes
@UseGuards(RefreshTokenGuard)

// Depois
@RequireRefreshToken()
```

## Estrutura de Erros Melhorada

### **Consistência de Response:**
```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Token de autenticação expirado", 
  "details": "Use o refresh token para obter um novo access token",
  "tokenType": "access",
  "canRefresh": true
}
```

### **Informações Úteis:**
- `tokenType`: Identifica qual tipo de token falhou
- `canRefresh`: Indica se pode usar refresh token
- `details`: Instruções específicas para correção

## Compatibilidade e Migração

### **Backward Compatibility:**
- Guards antigos ainda funcionam
- Migração pode ser gradual
- Sem breaking changes para clientes

### **Estratégia de Migração:**
1. **Fase 1**: Implementar UnifiedAuthGuard
2. **Fase 2**: Migrar novos endpoints
3. **Fase 3**: Refatorar endpoints existentes
4. **Fase 4**: Deprecar guards antigos

## Exemplo de Uso Prático

```typescript
@Controller('api/v1')
export class ModernController {
  
  // Rotas públicas (sem guard)
  @Get('health')
  healthCheck() { return { status: 'ok' }; }
  
  // Rotas autenticadas (access token)
  @Get('profile')
  @Authenticated()
  getProfile(@CurrentUser() user) { }
  
  @Post('data')
  @RequireAccessToken() // Equivalente a @Authenticated()
  createData(@CurrentUser() user, @Body() data) { }
  
  // Endpoints específicos de auth (refresh token)
  @Post('auth/refresh')
  @RequireRefreshToken()
  refreshToken(@RefreshToken() token: string) { }
  
  @Post('auth/revoke')  
  @RequireRefreshToken()
  revokeToken(@RefreshToken() token: string) { }
}
```

## Próximos Passos

1. **Testar** a nova implementação
2. **Migrar** controllers existentes gradualmente
3. **Deprecar** guards antigos
4. **Documentar** padrões de uso
5. **Treinar** equipe nos novos decorators

A refatoração elimina a necessidade de dois guards separados, simplifica o código e melhora a manutenibilidade seguindo rigorosamente os princípios SOLID.
