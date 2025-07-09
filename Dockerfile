# Multi-stage Dockerfile para RSS Feed Processor

# Base stage - dependências comuns
FROM node:lts-alpine AS base
WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Copiar arquivos de configuração de dependências
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Development stage
FROM base AS development
ENV NODE_ENV=development

# Instalar todas as dependências (incluindo dev)
RUN pnpm install --frozen-lockfile

# Gerar Prisma Client
RUN pnpm prisma generate

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando para desenvolvimento
CMD ["pnpm", "run", "start:dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production

# Instalar apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN pnpm prisma generate

# Construir aplicação
RUN pnpm run build

# Production stage
FROM node:lts-alpine AS production
WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Instalar apenas dependências de runtime
RUN apk add --no-cache \
    curl \
    dumb-init

# Copiar aplicação construída
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package.json ./
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma

# Criar diretório de logs
RUN mkdir -p /app/logs && chown nestjs:nodejs /app/logs

# Mudar para usuário não-root
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Expor porta
EXPOSE 3000

# Comando para produção
CMD ["dumb-init", "node", "dist/main"]
