# Multi-stage Dockerfile para RSS Feed Processor

# Base stage - dependências comuns
FROM node:lts-alpine AS base
WORKDIR /app

# Instalar dependências do sistema e pnpm em uma única camada
RUN apk add --no-cache curl python3 make g++ && \
    npm install -g pnpm

# Copiar arquivos de configuração de dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Development stage
FROM base AS development
ENV NODE_ENV=development

# Instalar todas as dependências (incluindo dev)
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando para desenvolvimento
CMD ["pnpm", "run", "start:dev"]

# Build stage
FROM base AS build

# Instalar todas as dependências, incluindo devDeps necessárias para compilar
RUN pnpm install --frozen-lockfile --prod=false

# Copiar código fonte
COPY . .

# Construir aplicação (o script já executa prisma generate internamente)
RUN pnpm run build

# Remover devDependencies antes de copiar para produção
RUN pnpm prune --prod

# Production stage
FROM node:lts-alpine AS production
WORKDIR /app

# Criar usuário não-root e instalar dependências de runtime em uma única camada
RUN apk add --no-cache curl dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

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
