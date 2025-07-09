#!/bin/bash

# Script para desenvolvimento - Inicia apenas Redis e Redis Commander

echo "🚀 Iniciando ambiente de desenvolvimento..."

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker compose -f docker-compose.dev.yml down

# Iniciar Redis e Redis Commander
echo "🔄 Iniciando Redis e Redis Commander..."
docker compose -f docker-compose.dev.yml up -d

# Aguardar Redis estar pronto
echo "⏳ Aguardando Redis estar pronto..."
until docker compose -f docker-compose.dev.yml exec redis redis-cli ping >/dev/null 2>&1; do
    echo "   Aguardando Redis..."
    sleep 2
done

echo "✅ Ambiente de desenvolvimento pronto!"
echo ""
echo "📊 Redis Commander: http://localhost:8081"
echo "   Usuário: admin"
echo "   Senha: admin"
echo ""
echo "🔧 Para conectar sua aplicação ao Redis:"
echo "   REDIS_URL=redis://localhost:6379/0"
echo ""
echo "🛑 Para parar o ambiente: npm run docker:dev:stop"
