#!/bin/bash

# Script para monitorar filas Redis e logs da aplicação

echo "📊 Monitor do Sistema de Filas"
echo "=============================="

# Função para mostrar estatísticas do Redis
show_redis_stats() {
    echo ""
    echo "🔢 Estatísticas Redis:"
    echo "----------------------"
    docker compose -f docker-compose.dev.yml exec redis redis-cli info keyspace
    docker compose -f docker-compose.dev.yml exec redis redis-cli info memory | grep used_memory_human
    docker compose -f docker-compose.dev.yml exec redis redis-cli info clients | grep connected_clients
}

# Função para mostrar filas do BullMQ
show_queue_stats() {
    echo ""
    echo "📋 Filas BullMQ:"
    echo "----------------"
    echo "Fila feed-processing:"
    docker compose -f docker-compose.dev.yml exec redis redis-cli eval "
        local waiting = redis.call('LLEN', 'bull:feed-processing:waiting')
        local active = redis.call('LLEN', 'bull:feed-processing:active')
        local completed = redis.call('ZCARD', 'bull:feed-processing:completed')
        local failed = redis.call('ZCARD', 'bull:feed-processing:failed')
        return 'Waiting: ' .. waiting .. ', Active: ' .. active .. ', Completed: ' .. completed .. ', Failed: ' .. failed
    " 0
    
    echo ""
    echo "Fila feed-priority:"
    docker compose -f docker-compose.dev.yml exec redis redis-cli eval "
        local waiting = redis.call('LLEN', 'bull:feed-priority:waiting')
        local active = redis.call('LLEN', 'bull:feed-priority:active')
        local completed = redis.call('ZCARD', 'bull:feed-priority:completed')
        local failed = redis.call('ZCARD', 'bull:feed-priority:failed')
        return 'Waiting: ' .. waiting .. ', Active: ' .. active .. ', Completed: ' .. completed .. ', Failed: ' .. failed
    " 0
}

# Loop principal
while true; do
    clear
    echo "📊 Monitor do Sistema de Filas - $(date)"
    echo "======================================"
    
    show_redis_stats
    show_queue_stats
    
    echo ""
    echo "🔄 Atualizando em 10 segundos... (Ctrl+C para sair)"
    sleep 10
done
