# Remoção de Refresh Tokens

## Overview

Este documento descreve a remoção completa do sistema de refresh tokens do RSS Feed Processor. Como o Supabase gerencia automaticamente a renovação de tokens, a implementação manual de refresh tokens era redundante e desnecessária.

## Mudanças Realizadas

### 1. Código Removido/Modificado

#### AuthService (`src/auth/auth.service.ts`)
- Removido campo `refreshToken` da interface `AuthResponse`
- Removido retorno de `refreshToken` nos métodos `login()` e `register()`

#### DTOs (`src/auth/dto/auth.dto.ts`)
- Removido campo `refreshToken?` da classe `AuthResponseDto`

#### Guards (`src/auth/guards/auth.guard.ts`)
- Removido campo `canRefresh` das mensagens de erro
- Atualizada mensagem para tokens expirados: "Faça login novamente" em vez de "Use refresh token"

#### Strategy (`src/auth/strategies/supabase-jwt.strategy.ts`)
- Removido campo `canRefresh` das mensagens de erro
- Atualizada mensagem para tokens expirados

### 2. Documentação Removida
- `docs/REFRESH_TOKEN_IMPLEMENTATION.md`
- `docs/REFRESH_TOKEN_USAGE_GUIDE.md`

### 3. API Documentation Atualizada
- Removido campo `refreshToken` dos exemplos de resposta em `docs/API_DOCUMENTATION.md`

## Comportamento Atual

### Autenticação
Os endpoints de login e registro agora retornam apenas:
```json
{
  "user": {
    "id": "string",
    "email": "string", 
    "role": "string"
  },
  "accessToken": "string"
}
```

### Token Expiration
Quando um token expira, o cliente deve:
1. Capturar o erro `TOKEN_EXPIRED`
2. Redirecionar o usuário para nova autenticação
3. Não tentar renovar o token automaticamente

### Supabase Auto-Refresh
O Supabase automaticamente gerencia a renovação de tokens quando:
- O cliente usa a biblioteca oficial do Supabase
- O cliente está configurado corretamente
- A sessão ainda é válida no lado do Supabase

## Benefícios da Remoção

1. **Simplificação**: Menos código para manter e debug
2. **Consistência**: Alinhamento com as práticas recomendadas do Supabase
3. **Segurança**: Evita implementações customizadas que podem ter vulnerabilidades
4. **Performance**: Menos chamadas de validação desnecessárias

## Impacto nos Clientes

### Frontend/Mobile Apps
- Clientes devem tratar erros `TOKEN_EXPIRED` redirecionando para login
- Não devem mais esperar ou usar campos `refreshToken`
- Devem usar bibliotecas oficiais do Supabase quando possível

### APIs Externas
- Não há mais endpoint de refresh token
- Tokens expirados requerem nova autenticação completa

## Migration Guide

Para aplicações que dependiam do refresh token:

1. **Remover lógica de refresh token do cliente**
2. **Implementar redirect para login em TOKEN_EXPIRED**
3. **Atualizar parsers de resposta da API**
4. **Testar fluxos de autenticação**

## Conclusão

A remoção dos refresh tokens simplifica significativamente o sistema de autenticação, aproveitando as capacidades nativas do Supabase para gerenciamento de sessões e renovação automática de tokens.
