# API Documentation - RSS Feed Processor

## Overview

This API provides RSS feed management and user authentication services. The API supports user registration, authentication, feed subscription management, and feed item aggregation.

**Base URL**: `http://localhost:3000` (development)

## Authentication

All feed endpoints require JWT authentication. Include the Authorization header in your requests:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints (`/auth`)

### POST `/auth/login`

Authenticate a user and receive access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: Minimum 6 characters

**Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format or password too short
- `401 Unauthorized`: Invalid credentials

---

### POST `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword"
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: Minimum 6 characters

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format, password too short, or email already exists
- `409 Conflict`: User already exists

---

### POST `/auth/logout`

Logout the current user.

**Request Body:** None

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## Feed Endpoints (`/feed`)

All feed endpoints require authentication via `Authorization: Bearer <token>` header.

### GET `/feed/validate`

Validate if a URL is a valid RSS feed.

**Query Parameters:**
- `url` (required): RSS feed URL to validate

**Example Request:**
```
GET /feed/validate?url=https://www.rocketseat.com.br/blog/rss
```

**Validation Rules:**
- `url`: Must be a valid URL with protocol (http/https)

**Response (200):**
```json
{
  "valid": true,
  "title": "Rocketseat Blog",
  "description": "Blog do Rocketseat",
  "items": [
    {
      "title": "Como começar a programar",
      "url": "https://www.rocketseat.com.br/blog/como-comecar-programar",
      "published_at": "2025-06-16T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid URL format
- `404 Not Found`: URL is not a valid RSS feed
- `500 Internal Server Error`: Network error or parsing failure

---

### GET `/feed/parse`

Parse RSS feed and return content of the 5 most recent items.

**Query Parameters:**
- `url` (required): RSS feed URL to parse

**Example Request:**
```
GET /feed/parse?url=https://www.rocketseat.com.br/blog/rss
```

**Validation Rules:**
- `url`: Must be a valid URL with protocol (http/https)

**Response (200):**
```json
{
  "feed": {
    "title": "Rocketseat Blog",
    "description": "Blog do Rocketseat",
    "url": "https://www.rocketseat.com.br/blog/rss"
  },
  "items": [
    {
      "title": "Tudo que você precisa saber para começar a programar ainda neste ano",
      "url": "https://www.rocketseat.com.br/blog/artigos/post/como-comecar-a-programar-ainda-neste-ano",
      "content": "<div>Full article content with extracted text...</div>",
      "thumbnail": "https://storage.googleapis.com/star-lab/blog/OGs/como-iniciar-programacao.webp",
      "published_at": "2025-06-16T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Invalid URL format
- `404 Not Found`: Feed not found or inaccessible
- `500 Internal Server Error`: Parsing error

---

### POST `/feed/subscribe`

Subscribe user to an RSS feed.

**Request Body:**
```json
{
  "url": "https://www.rocketseat.com.br/blog/rss"
}
```

**Validation Rules:**
- `url`: Must be a valid URL with protocol (http/https)

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "feed_id": "e9ac333c-a896-43a3-9e11-55e2e9595735",
  "is_active": true,
  "created_at": "2025-06-23T10:30:00.000Z",
  "feed": {
    "id": "e9ac333c-a896-43a3-9e11-55e2e9595735",
    "name": "Rocketseat",
    "url": "https://www.rocketseat.com.br/blog/rss",
    "description": "Blog do Rocketseat"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid URL format or feed already subscribed
- `404 Not Found`: Invalid RSS feed
- `409 Conflict`: User already subscribed to this feed

---

### GET `/feed/user-feeds`

Get all feeds subscribed by the authenticated user.

**Query Parameters:** None

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "feed_id": "e9ac333c-a896-43a3-9e11-55e2e9595735",
    "is_active": true,
    "created_at": "2025-06-23T10:30:00.000Z",
    "updated_at": "2025-06-23T10:30:00.000Z",
    "feed": {
      "id": "e9ac333c-a896-43a3-9e11-55e2e9595735",
      "name": "Rocketseat",
      "url": "https://www.rocketseat.com.br/blog/rss",
      "description": "Blog do Rocketseat",
      "created_at": "2025-06-20T08:00:00.000Z"
    }
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing authentication token

---

### PUT `/feed/user-feeds/:feed_id/status`

Update the active/inactive status of a user's feed subscription.

**URL Parameters:**
- `feed_id` (required): UUID of the feed subscription

**Request Body:**
```json
{
  "is_active": false
}
```

**Validation Rules:**
- `feed_id`: Must be a valid UUID v4
- `is_active`: Must be a boolean value

**Response (200):**
```json
{
  "message": "Status do feed atualizado com sucesso"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid feed_id format or is_active value
- `403 Forbidden`: User doesn't own this feed subscription
- `404 Not Found`: Feed subscription not found

---

### DELETE `/feed/user-feeds/:feed_id`

Remove user's subscription from a feed.

**URL Parameters:**
- `feed_id` (required): UUID of the feed subscription

**Validation Rules:**
- `feed_id`: Must be a valid UUID v4

**Response (200):**
```json
{
  "message": "Inscrição removida com sucesso"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid feed_id format
- `403 Forbidden`: User doesn't own this feed subscription
- `404 Not Found`: Feed subscription not found

---

### GET `/feed/user-feed-items`

Get aggregated feed items from all active user subscriptions.

**Query Parameters:**
- `limit` (optional): Number of items to return (1-100, default: 20)
- `offset` (optional): Number of items to skip (default: 0)
- `sort` (optional): Sort field - `created_at` or `published_at` (default: `published_at`)
- `order` (optional): Sort order - `asc` or `desc` (default: `desc`)

**Example Request:**
```
GET /feed/user-feed-items?limit=10&offset=0&sort=published_at&order=desc
```

**Validation Rules:**
- `limit`: Integer between 1 and 100
- `offset`: Integer >= 0
- `sort`: Must be 'created_at' or 'published_at'
- `order`: Must be 'asc' or 'desc'

**Response (200):**
```json
{
  "items": [
    {
      "id": "2a8507cf-ed84-4a74-898a-cf22e60e8d7f",
      "title": "Tudo que você precisa saber para começar a programar ainda neste ano",
      "url": "https://www.rocketseat.com.br/blog/artigos/post/como-comecar-a-programar-ainda-neste-ano",
      "content": "<div>Extracted article content...</div>",
      "thumbnail": "https://storage.googleapis.com/star-lab/blog/OGs/como-iniciar-programacao.webp",
      "published_at": "2025-06-16T00:00:00.000Z",
      "created_at": "2025-06-22T19:46:22.027Z",
      "feed": {
        "id": "e9ac333c-a896-43a3-9e11-55e2e9595735",
        "name": "Rocketseat",
        "url": "https://www.rocketseat.com.br/blog/rss"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45,
    "hasMore": true
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or missing authentication token

---

### GET `/feed/feed-item/:feed_item_id`

Get a specific feed item by ID (only from user's subscribed feeds).

**URL Parameters:**
- `feed_item_id` (required): UUID of the feed item

**Validation Rules:**
- `feed_item_id`: Must be a valid UUID v4

**Response (200):**
```json
{
  "id": "1ba18af0-09da-4b46-83a6-9e6434bdc097",
  "title": "Israel x Irã: quem está certo?",
  "url": "https://www.youtube.com/watch?v=fl0wff0SbaU",
  "content": "🧠 Aprenda a investir comigo no Brasil e no mundo...",
  "thumbnail": "https://i3.ytimg.com/vi/fl0wff0SbaU/hqdefault.jpg",
  "published_at": "2025-06-21T18:05:19.000Z",
  "created_at": "2025-06-22T19:44:29.367Z",
  "feed": {
    "id": "1b5e468d-3b8e-4e2d-b509-a6243370bfa8",
    "name": "Investidor Sardinha",
    "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCM3vJxmuJJkk1r0yzFI9eZg"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid feed_item_id format
- `404 Not Found`: Feed item not found in user's subscribed feeds
- `401 Unauthorized`: Invalid or missing authentication token

---

## Error Response Format

All error responses follow this consistent format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-06-23T10:30:00.000Z",
  "path": "/feed/validate"
}
```

## Status Codes

- `200 OK`: Successful GET, PUT requests
- `201 Created`: Successful POST requests
- `400 Bad Request`: Invalid input data or validation errors
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied to resource
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists or conflict
- `500 Internal Server Error`: Server error

## Rate Limiting

Currently, no rate limiting is implemented, but it's recommended for production use.

## Content Extraction

The API automatically extracts content from feed items using intelligent content extraction algorithms that:

- Remove ads and navigation elements
- Extract main article content
- Preserve formatting and images
- Generate thumbnails when available
- Handle various content types (blog posts, YouTube videos, etc.)

## Data Types

### Feed Object
```typescript
{
  id: string (UUID)
  name: string
  url: string (RSS feed URL)
  description?: string
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### Feed Item Object
```typescript
{
  id: string (UUID)
  title: string
  url: string (original article URL)
  content: string (extracted HTML content)
  thumbnail?: string (image URL)
  published_at: string (ISO 8601)
  created_at: string (ISO 8601)
  feed: Feed
}
```

### User Feed Subscription Object
```typescript
{
  id: string (UUID)
  user_id: string (UUID)
  feed_id: string (UUID)
  is_active: boolean
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  feed: Feed
}
```
