#!/bin/bash

# Script de teste para os endpoints da aplicação RSS Feed Processor
# Certifique-se de que a aplicação está rodando em http://localhost:3000

echo "🚀 Testando RSS Feed Processor"
echo "================================="

# Teste 1: Validar feed RSS direto
echo -e "\n📰 Teste 1: Feed RSS direto (BBC News)"
curl -s "http://localhost:3000/feed/validate?url=https://feeds.bbci.co.uk/news/rss.xml" | jq .

# Teste 2: Website com feed RSS
echo -e "\n🌐 Teste 2: Website com feed RSS descoberto"
curl -s "http://localhost:3000/feed/validate?url=https://techcrunch.com" | jq .

# Teste 3: Canal do YouTube (exemplo)
echo -e "\n📺 Teste 3: Canal do YouTube"
curl -s "http://localhost:3000/feed/validate?url=https://www.youtube.com/@veritasium" | jq .

# Teste 4: Extrair conteúdo de artigo
echo -e "\n📄 Teste 4: Extrair conteúdo de artigo"
curl -s "http://localhost:3000/feed/extract?url=https://www.bbc.com/news/technology-67321176" | jq .

# Teste 5: URL inválida (deve retornar erro)
echo -e "\n❌ Teste 5: URL inválida"
curl -s "http://localhost:3000/feed/validate?url=not-a-url" | jq .

echo -e "\n✅ Testes concluídos!"
