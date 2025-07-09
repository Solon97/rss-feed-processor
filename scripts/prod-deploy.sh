#!/bin/bash

# Script para produção - Build e deploy completo

echo "🚀 Iniciando deploy de produção..."

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado. Copie .env.example para .env e configure as variáveis."
    exit 1
fi

# Build da aplicação
echo "🔨 Construindo aplicação..."
docker compose build --no-cache app

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker compose down

# Iniciar todos os serviços
echo "🔄 Iniciando todos os serviços..."
docker compose --profile app up -d

# Aguardar serviços estarem prontos
echo "⏳ Aguardando serviços estarem prontos..."
sleep 10

# Verificar status dos containers
echo "📊 Status dos containers:"
docker compose ps

echo "✅ Deploy de produção concluído!"
echo ""
echo "🌐 Aplicação: http://localhost:${PORT:-3000}"
echo "📊 Redis Commander: http://localhost:8081 (se habilitado)"
echo ""
echo "🛑 Para parar: npm run docker:prod:stop"
