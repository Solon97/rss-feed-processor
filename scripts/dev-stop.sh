#!/bin/bash

# Script para parar ambiente de desenvolvimento

echo "🛑 Parando ambiente de desenvolvimento..."

docker compose -f docker-compose.dev.yml down

echo "✅ Ambiente de desenvolvimento parado!"
