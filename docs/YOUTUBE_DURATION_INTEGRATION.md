# YouTube Video Duration Integration

Este documento descreve a implementação da funcionalidade de duração de vídeos do YouTube usando a YouTube Data API v3.

## Funcionalidades Implementadas

### ✅ 1. Integração com YouTube Data API v3
- **Endpoint Utilizado:** `videos.list` com parte `contentDetails`
- **Duração:** Extraída no formato ISO 8601 (ex: "PT10M30S" para 10 minutos e 30 segundos)
- **Fallback:** Sistema continua funcionando mesmo sem a API key configurada

### ✅ 2. Armazenamento no Banco de Dados
- **Campo Adicionado:** `duration` na tabela `feed_items`
- **Tipo:** `String` opcional que armazena duração no formato ISO 8601
- **Migração:** Criada automaticamente via Prisma

### ✅ 3. Integração com Sistema de Processamento
- **YouTube Data API Service:** Novo serviço dedicado para comunicação com a API
- **Extração Inteligente:** Usa múltiplas estratégias (API → oembed → scraping)
- **Performance:** Timeout de 5 segundos para chamadas à API

## Configuração

### 1. Obter YouTube API Key

1. Acesse o [Google Cloud Console](https://console.developers.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a "YouTube Data API v3"
4. Vá para "Credenciais" → "Criar credenciais" → "Chave de API"
5. (Opcional) Restrinja a chave para YouTube Data API v3

### 2. Configurar Variável de Ambiente

Adicione ao arquivo `.env`:

```bash
# Configuração do YouTube Data API (opcional)
# Para obter durações de vídeos do YouTube
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 3. Autenticação com Google/Supabase (Tentativa Inicial)

A implementação atual usa API key por simplicidade e confiabilidade. No futuro, pode ser integrada com OAuth2 se necessário:

```typescript
// Exemplo para futuro OAuth2 integration
async getVideoDurationWithAuth(videoId: string, accessToken: string) {
  // Implementation would use user's Google access token
  // const headers = { Authorization: `Bearer ${accessToken}` };
}
```

## Como Funciona

### 1. Processamento de Feed YouTube

```typescript
// 1. Feed RSS do YouTube é processado normalmente
const feedData = await feedParsing.parseFeed(youtubeRssUrl);

// 2. Para cada item do feed (vídeo)
for (const item of feedData.items) {
  // 3. Extrai ID do vídeo da URL
  const videoId = extractYouTubeVideoId(item.link);
  
  // 4. Busca duração via YouTube Data API
  const duration = await youtubeApiService.getVideoDuration(videoId);
  
  // 5. Salva no banco com duração
  await prisma.feed_items.create({
    data: {
      // ... outros campos
      duration, // "PT10M30S"
    }
  });
}
```

### 2. Estratégias de Extração (Fallback)

```typescript
async extractVideoInfo(url: string, videoId: string) {
  let title, duration;

  // 1ª Tentativa: YouTube Data API (inclui duração)
  if (youtubeApiService.isAvailable()) {
    const info = await youtubeApiService.getVideoInfo(videoId);
    title = info?.title;
    duration = info?.duration; // ✅ Duração disponível
  }

  // 2ª Tentativa: YouTube oembed API (sem duração)
  if (!title) {
    title = await getVideoTitleFromOEmbed(videoId);
  }

  // 3ª Tentativa: Page scraping (sem duração)
  if (!title) {
    title = await getVideoTitleFromPage(url);
  }

  return { title, duration, thumbnail, ... };
}
```

## Formato da Duração

### ISO 8601 Duration Format

A duração é armazenada no formato ISO 8601, seguindo o padrão do YouTube:

```
PT[hours]H[minutes]M[seconds]S

Exemplos:
- PT1M30S      → 1 minuto e 30 segundos
- PT10M        → 10 minutos
- PT1H5M20S    → 1 hora, 5 minutos e 20 segundos
- PT45S        → 45 segundos
```

### Formatação para Exibição

O serviço inclui um método utilitário para converter para formato legível:

```typescript
import { YouTubeDataApiService } from './youtube-data-api.service';

// Converter ISO 8601 para formato legível
const humanDuration = YouTubeDataApiService.formatDuration("PT10M30S");
console.log(humanDuration); // "10:30"

const longDuration = YouTubeDataApiService.formatDuration("PT1H5M20S");
console.log(longDuration); // "1:05:20"
```

## Resposta da API

### Exemplo de Resposta com Duração

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Como configurar React com TypeScript",
      "url": "https://www.youtube.com/watch?v=videoId",
      "content": "",
      "thumbnail": "https://img.youtube.com/vi/videoId/maxresdefault.jpg",
      "duration": "PT15M30S",
      "published_at": "2025-01-01T00:00:00.000Z",
      "created_at": "2025-01-02T10:00:00.000Z",
      "feed": {
        "id": "feed-uuid",
        "name": "Canal Tech",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC..."
      }
    }
  ]
}
```

## Benefícios

- ✅ **Informação Completa:** Usuários podem ver a duração dos vídeos antes de assistir
- ✅ **Filtros Futuros:** Possibilidade de filtrar por duração (vídeos curtos/longos)
- ✅ **Performance:** Não afeta a performance quando API key não está configurada
- ✅ **Confiabilidade:** Sistema de fallback garante funcionamento sempre
- ✅ **Compatibilidade:** Funciona com sistema de processamento existente

## Custos e Limites

### YouTube Data API v3 Quotas

- **Quota Padrão:** 10.000 unidades/dia (gratuito)
- **Custo por Requisição:** 1 unidade por chamada `videos.list`
- **Exemplo:** 10.000 vídeos processados por dia = quota completa

### Otimizações Implementadas

1. **Cache Natural:** Duração é salva no banco, não reprocessada
2. **Batch Processing:** Pode ser otimizado para processar múltiplos vídeos numa única requisição
3. **Timeout:** 5 segundos para evitar travamento
4. **Graceful Degradation:** Funciona sem API key

## Monitoramento

### Logs Disponíveis

```bash
# Sucesso
[YouTubeDataApiService] Retrieved duration for video abc123: PT10M30S

# API indisponível
[YouTubeDataApiService] YouTube API not available, skipping duration fetch

# Erro
[YouTubeDataApiService] Failed to fetch duration for video abc123: API quota exceeded
```

### Métricas Sugeridas

- Taxa de sucesso das chamadas à API
- Tempo médio de resposta
- Número de vídeos processados com/sem duração
- Quota usage diário

## Futuras Melhorias

### 1. Batch Processing

```typescript
// Processar múltiplos vídeos numa única requisição
async getMultipleVideosDuration(videoIds: string[]): Promise<Record<string, string>> {
  const url = `${this.baseUrl}/videos?id=${videoIds.join(',')}&part=contentDetails&key=${this.apiKey}`;
  // ... implementation
}
```

### 2. OAuth2 Integration

```typescript
// Usar tokens de usuário para aumentar quota
async getVideoDurationWithUserAuth(videoId: string, userToken: string) {
  // Use user's Google account quota instead of app quota
}
```

### 3. Caching Inteligente

```typescript
// Cache de durações por videoId para evitar reprocessamento
const durationCache = new Map<string, string>();
```

## Troubleshooting

### Problema: "API quota exceeded"

**Solução:**
1. Aguardar reset diário da quota
2. Implementar batch processing
3. Considerar upgrade no Google Cloud

### Problema: Duração não aparece

**Verificar:**
1. API key configurada corretamente
2. YouTube Data API v3 ativada no projeto
3. Logs do serviço para erros
4. Vídeo existe e é público

### Problema: Performance lenta

**Otimizações:**
1. Verificar timeout de 5s
2. Implementar retry com backoff
3. Considerar processing assíncrono
