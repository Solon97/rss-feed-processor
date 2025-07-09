#!/bin/bash

# Script para validar se o ambiente Docker está funcionando corretamente

echo "🔍 Validando ambiente Docker..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0

# Função para teste
test_command() {
    local description="$1"
    local command="$2"
    local expected_output="$3"
    
    echo -n "🧪 $description... "
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# Função para teste com output esperado
test_command_output() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "🧪 $description... "
    
    local output=$(eval "$command" 2>/dev/null)
    if [[ "$output" == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Esperado: $expected"
        echo "   Obtido: $output"
        ((TESTS_FAILED++))
    fi
}

echo ""
echo "📋 Executando testes de validação..."
echo "===================================="

# Teste 1: Docker está instalado
test_command "Docker está instalado" "docker --version"

# Teste 2: Docker Compose está instalado
test_command "Docker Compose está instalado" "docker compose --version"

# Teste 3: Arquivo .env existe
test_command "Arquivo .env existe" "test -f .env"

# Teste 4: Redis container pode ser iniciado
echo -n "🧪 Redis container inicia corretamente... "
if docker compose -f docker-compose.dev.yml up -d redis >/dev/null 2>&1; then
    sleep 3
    if docker compose -f docker-compose.dev.yml exec redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL - Redis não responde${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${RED}❌ FAIL - Container não inicia${NC}"
    ((TESTS_FAILED++))
fi

# Teste 5: Redis Commander está acessível
echo -n "🧪 Redis Commander está acessível... "
sleep 5
if curl -s http://localhost:8081 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  SKIP - Redis Commander pode não estar habilitado${NC}"
fi

# Teste 6: Configuração Redis
test_command_output "Redis aceita comandos" "docker compose -f docker-compose.dev.yml exec redis redis-cli ping" "PONG"

# Teste 7: Estrutura de filas BullMQ
echo -n "🧪 Estrutura de filas pode ser criada... "
if docker compose -f docker-compose.dev.yml exec redis redis-cli SET test_key test_value >/dev/null 2>&1; then
    if docker compose -f docker-compose.dev.yml exec redis redis-cli GET test_key >/dev/null 2>&1; then
        docker compose -f docker-compose.dev.yml exec redis redis-cli DEL test_key >/dev/null 2>&1
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Limpeza
echo ""
echo "🧹 Limpando ambiente de teste..."
docker compose -f docker-compose.dev.yml down >/dev/null 2>&1

echo ""
echo "📊 Resultados dos Testes"
echo "========================"
echo -e "✅ Testes Passaram: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Testes Falharam: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Todos os testes passaram! Ambiente Docker está pronto.${NC}"
    echo ""
    echo "📚 Próximos passos:"
    echo "1. Execute: npm run docker:dev:start"
    echo "2. Inicie sua aplicação: npm run start:dev"
    echo "3. Monitore as filas: npm run docker:monitor"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Alguns testes falharam. Verifique a configuração.${NC}"
    echo ""
    echo "🔧 Soluções possíveis:"
    echo "1. Verifique se Docker está rodando"
    echo "2. Copie .env.example para .env"
    echo "3. Execute: docker compose down && docker system prune -f"
    exit 1
fi
