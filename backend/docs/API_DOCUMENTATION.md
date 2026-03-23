# Geocoding API Documentation
# Documentation de l'API de Géocodage

## Overview / Aperçu

The Geocoding API provides endpoints for geocoding African villages, batch processing, search history management, and AI-powered features.

L'API de Géocodage fournit des endpoints pour le géocodage des villages africains, le traitement par lots, la gestion de l'historique de recherche et les fonctionnalités alimentées par l'IA.

**Base URL / URL de Base:** `http://localhost:5000/api`

---

## Table of Contents / Table des Matières

1. [Authentication / Authentification](#authentication)
2. [Rate Limiting / Limitation de Débit](#rate-limiting)
3. [Error Codes / Codes d'Erreur](#error-codes)
4. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Geocoding](#geocoding)
   - [Batch Processing](#batch-processing)
   - [Search History](#search-history)
   - [AI Features](#ai-features)
   - [Filters](#filters)
   - [Export](#export)
5. [Code Examples / Exemples de Code](#code-examples)

---

## Authentication

Currently, the API does not require authentication for basic usage. For production deployments, implement API key authentication.

Actuellement, l'API ne nécessite pas d'authentification pour une utilisation basique. Pour les déploiements en production, implémentez l'authentification par clé API.

### Future Authentication Header
```
Authorization: Bearer YOUR_API_KEY
```

---

## Rate Limiting

| Endpoint Type | Requests | Window |
|--------------|----------|--------|
| Standard API | 100 | 15 minutes |
| Batch Processing | 10 | 15 minutes |
| AI Features | 50 | 15 minutes |

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

**Rate Limit Exceeded Response:**
```json
{
  "error": {
    "en": "Too many requests, please try again later.",
    "fr": "Trop de requêtes, veuillez réessayer plus tard."
  }
}
```

---

## Error Codes

| Code | Name | Description (EN) | Description (FR) |
|------|------|-----------------|------------------|
| 400 | BAD_REQUEST | Invalid request parameters | Paramètres de requête invalides |
| 401 | UNAUTHORIZED | Authentication required | Authentification requise |
| 403 | FORBIDDEN | Access denied | Accès refusé |
| 404 | NOT_FOUND | Resource not found | Ressource non trouvée |
| 413 | FILE_TOO_LARGE | File size exceeds limit | Taille du fichier dépassée |
| 429 | RATE_LIMITED | Too many requests | Trop de requêtes |
| 500 | INTERNAL_ERROR | Server error | Erreur serveur |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable | Service temporairement indisponible |

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": {
      "en": "English error message",
      "fr": "Message d'erreur en français"
    },
    "details": []
  }
}
```

---

## Endpoints

### Health Check

#### GET /api/health
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "message": {
    "en": "Geocoding API is running",
    "fr": "L'API de géocodage fonctionne"
  }
}
```

---

### Geocoding

#### POST /api/geocoding/single
Geocode a single village.

**Request Body:**
```json
{
  "villageName": "Ouagadougou",
  "countryCode": "BF",
  "region": "Centre",
  "department": "",
  "arrondissement": ""
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "villageName": "Ouagadougou",
    "latitude": 12.3714,
    "longitude": -1.5197,
    "confidence": 0.95,
    "source": "nominatim",
    "formattedAddress": "Ouagadougou, Centre, Burkina Faso",
    "borderProximity": {
      "distance": 45.2,
      "nearestCountry": "Ghana"
    }
  }
}
```

---

#### POST /api/geocoding/batch
Batch geocode villages from uploaded file.

**Request Body:**
```json
{
  "filePath": "/uploads/abc123.xlsx",
  "columnName": "Village",
  "filters": {
    "countryCode": "CM",
    "region": "Centre"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "en": "Batch geocoding completed",
    "fr": "Géocodage par lots terminé"
  },
  "data": {
    "total": 100,
    "found": 85,
    "notFound": 15,
    "results": [...]
  }
}
```

---

#### POST /api/geocoding/batch-manual
Batch geocode villages from manual entry.

**Request Body:**
```json
{
  "villages": ["Village1", "Village2", "Village3"],
  "filters": {
    "countryCode": "SN"
  }
}
```

---

#### POST /api/geocoding/upload
Upload file for geocoding.

**Request:** `multipart/form-data`
- `file`: Excel or CSV file (max 10MB)

**Supported Formats:** `.xlsx`, `.xls`, `.csv`, `.txt`

**Response:**
```json
{
  "success": true,
  "data": {
    "filePath": "/uploads/abc123.xlsx",
    "fileName": "villages.xlsx",
    "columns": ["Name", "Region", "Country"],
    "rowCount": 150
  }
}
```

---

#### GET /api/geocoding/columns
Get columns from uploaded file.

**Query Parameters:**
- `filePath` (required): Path to uploaded file

**Response:**
```json
{
  "success": true,
  "data": {
    "columns": ["Village Name", "Region", "Department"],
    "preview": [
      {"Village Name": "Yaoundé", "Region": "Centre", "Department": "Mfoundi"}
    ]
  }
}
```

---

#### POST /api/geocoding/search-area
Search for villages within a radius.

**Request Body:**
```json
{
  "center": {
    "lat": 12.3714,
    "lng": -1.5197
  },
  "radius": 20,
  "countryCode": "BF"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "en": "Found 25 locations within 20km",
    "fr": "25 emplacements trouvés dans un rayon de 20km"
  },
  "data": {
    "results": [...],
    "count": 25,
    "searchParams": {...},
    "statistics": {
      "byType": {
        "village": 15,
        "hamlet": 8,
        "neighbourhood": 2
      }
    }
  }
}
```

---

#### GET /api/geocoding/sources/status
Get status of all geocoding sources.

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": {
      "googleMaps": {
        "enabled": true,
        "available": true,
        "reliability": 0.95,
        "rateLimit": {"requestsPerDay": 25000}
      },
      "nominatim": {
        "enabled": true,
        "available": true,
        "reliability": 0.85,
        "rateLimit": {"requestsPerSecond": 1}
      },
      "openCage": {
        "enabled": true,
        "available": true,
        "reliability": 0.82,
        "remaining": 2400,
        "limit": 2500
      }
    },
    "totalEnabled": 4,
    "totalAvailable": 4
  }
}
```

---

### Batch Processing

#### POST /api/geocoding/batch/upload
Upload file for batch processing.

**Request:** `multipart/form-data`
- `file`: Excel or CSV file
- `columnName`: Column containing village names
- `filters`: JSON string of filters

**Response:**
```json
{
  "success": true,
  "message": {
    "en": "Batch job created and processing started",
    "fr": "Travail par lots créé et traitement démarré"
  },
  "data": {
    "batchId": "batch_abc123",
    "status": "processing"
  }
}
```

---

#### GET /api/geocoding/batch/:batchId/status
Get batch processing status.

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_abc123",
    "status": "processing",
    "progress": {
      "total": 100,
      "processed": 45,
      "percentage": 45
    },
    "startedAt": "2024-01-15T10:00:00.000Z",
    "estimatedCompletion": "2024-01-15T10:15:00.000Z"
  }
}
```

---

#### GET /api/geocoding/batch/:batchId/results
Get batch processing results.

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_abc123",
    "status": "completed",
    "results": [...],
    "statistics": {
      "total": 100,
      "found": 85,
      "notFound": 15,
      "avgConfidence": 0.82
    }
  }
}
```

---

#### POST /api/geocoding/batch/:batchId/ai-analysis
Get AI analysis of batch results.

**Response:**
```json
{
  "success": true,
  "data": {
    "qualityScore": 85,
    "patterns": [
      "Most villages are in the Centre region",
      "15% of villages have spelling variations"
    ],
    "recommendations": [
      "Consider verifying low-confidence results manually",
      "Check for alternative spellings"
    ],
    "insights": "..."
  }
}
```

---

### Search History

#### GET /api/geocoding/history
Get search history with pagination and filters.

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 50): Results per page
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `query`: Search query filter
- `type`: Search type filter (single, batch, area)
- `found`: Filter by found status (true/false)
- `countryCode`: Filter by country

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

---

#### GET /api/geocoding/history/stats
Get search history statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSearches": 500,
    "successRate": 0.85,
    "avgConfidence": 0.78,
    "byType": {
      "single": 300,
      "batch": 150,
      "area": 50
    },
    "byCountry": {
      "CM": 200,
      "SN": 150,
      "BF": 100
    },
    "trends": {
      "daily": [...],
      "weekly": [...]
    }
  }
}
```

---

#### POST /api/geocoding/history/ai-insights
Get AI insights from search history.

**Headers:**
- `Accept-Language`: `en` or `fr`

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": "Based on your search patterns...",
    "recommendations": [...],
    "trends": [...]
  }
}
```

---

#### DELETE /api/geocoding/history/:id
Delete a history entry.

**Response:**
```json
{
  "success": true,
  "message": {
    "en": "History entry deleted",
    "fr": "Entrée d'historique supprimée"
  }
}
```

---

#### DELETE /api/geocoding/history
Clear all history.

**Response:**
```json
{
  "success": true,
  "message": {
    "en": "All history cleared",
    "fr": "Tout l'historique effacé"
  }
}
```

---

### AI Features

#### POST /api/geocoding/ai/recommend
Get AI recommendations for search.

**Request Body:**
```json
{
  "villageName": "Yaounde",
  "countryCode": "CM",
  "context": "Looking for the capital city"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "suggestion": "Yaoundé",
        "confidence": 0.95,
        "reason": "Correct spelling with accent"
      }
    ],
    "tips": [
      "Try including the region name for better results"
    ]
  }
}
```

---

#### POST /api/geocoding/ai/suggest-names
Get AI name suggestions.

**Request Body:**
```json
{
  "villageName": "Douala",
  "countryCode": "CM"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {"name": "Douala", "similarity": 1.0},
      {"name": "Douala I", "similarity": 0.9},
      {"name": "Douala II", "similarity": 0.9}
    ]
  }
}
```

---

#### POST /api/geocoding/ai/explain-confidence
Explain confidence scores with AI.

**Request Body:**
```json
{
  "result": {
    "villageName": "Bamenda",
    "confidence": 0.75,
    "source": "nominatim"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": "The confidence score of 75% indicates...",
    "factors": [
      {"factor": "Name match", "score": 0.9},
      {"factor": "Source reliability", "score": 0.85}
    ],
    "suggestions": [...]
  }
}
```

---

#### POST /api/geocoding/ai/result-context
Get result context with AI.

**Request Body:**
```json
{
  "result": {
    "villageName": "Garoua",
    "latitude": 9.3,
    "longitude": 13.4
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "context": "Garoua is the capital of the North Region...",
    "nearbyPlaces": [...],
    "historicalInfo": "..."
  }
}
```

---

#### GET /api/geocoding/ai/status
Check AI service status.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "model": "deepseek-chat",
    "responseTime": 250
  }
}
```

---

### Filters

#### GET /api/filters/countries
Get list of African countries.

**Response:**
```json
{
  "success": true,
  "data": [
    {"code": "CM", "name": {"en": "Cameroon", "fr": "Cameroun"}},
    {"code": "SN", "name": {"en": "Senegal", "fr": "Sénégal"}}
  ]
}
```

---

#### GET /api/filters/regions/:countryCode
Get regions for a country.

**Response:**
```json
{
  "success": true,
  "data": [
    {"code": "CE", "name": "Centre"},
    {"code": "LT", "name": "Littoral"}
  ]
}
```

---

### Export

#### POST /api/export/excel
Export results to Excel.

**Request Body:**
```json
{
  "results": [...],
  "options": {
    "includeConfidence": true,
    "includeSource": true,
    "includeAddress": true
  }
}
```

**Response:** Binary Excel file

---

#### POST /api/export/csv
Export results to CSV.

**Request Body:**
```json
{
  "results": [...],
  "options": {
    "delimiter": ",",
    "includeHeaders": true
  }
}
```

**Response:** CSV text file

---

#### POST /api/export/pdf
Export results to PDF.

**Request Body:**
```json
{
  "results": [...],
  "options": {
    "title": "Geocoding Results",
    "includeMap": true,
    "includeStatistics": true
  }
}
```

**Response:** Binary PDF file

---

## Code Examples

### JavaScript (Fetch)

```javascript
// Single geocoding
async function geocodeSingle(villageName, countryCode) {
  const response = await fetch('http://localhost:5000/api/geocoding/single', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'en'
    },
    body: JSON.stringify({
      villageName,
      countryCode
    })
  });
  
  const data = await response.json();
  return data;
}

// Batch geocoding
async function batchGeocode(villages, filters) {
  const response = await fetch('http://localhost:5000/api/geocoding/batch-manual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      villages,
      filters
    })
  });
  
  return await response.json();
}

// File upload
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:5000/api/geocoding/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}
```

### Python (Requests)

```python
import requests

BASE_URL = 'http://localhost:5000/api'

# Single geocoding
def geocode_single(village_name, country_code):
    response = requests.post(
        f'{BASE_URL}/geocoding/single',
        json={
            'villageName': village_name,
            'countryCode': country_code
        },
        headers={'Accept-Language': 'en'}
    )
    return response.json()

# Batch geocoding
def batch_geocode(villages, filters=None):
    response = requests.post(
        f'{BASE_URL}/geocoding/batch-manual',
        json={
            'villages': villages,
            'filters': filters or {}
        }
    )
    return response.json()

# File upload
def upload_file(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            f'{BASE_URL}/geocoding/upload',
            files=files
        )
    return response.json()

# Get search history
def get_history(page=1, limit=50):
    response = requests.get(
        f'{BASE_URL}/geocoding/history',
        params={'page': page, 'limit': limit}
    )
    return response.json()

# Example usage
if __name__ == '__main__':
    # Single search
    result = geocode_single('Yaoundé', 'CM')
    print(f"Found: {result['data']['latitude']}, {result['data']['longitude']}")
    
    # Batch search
    villages = ['Douala', 'Bamenda', 'Garoua']
    results = batch_geocode(villages, {'countryCode': 'CM'})
    print(f"Found {results['data']['found']} of {results['data']['total']}")
```

### cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Single geocoding
curl -X POST http://localhost:5000/api/geocoding/single \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"villageName": "Yaoundé", "countryCode": "CM"}'

# Batch geocoding (manual)
curl -X POST http://localhost:5000/api/geocoding/batch-manual \
  -H "Content-Type: application/json" \
  -d '{"villages": ["Douala", "Bamenda"], "filters": {"countryCode": "CM"}}'

# File upload
curl -X POST http://localhost:5000/api/geocoding/upload \
  -F "file=@villages.xlsx"

# Get search history
curl "http://localhost:5000/api/geocoding/history?page=1&limit=50"

# Get statistics
curl http://localhost:5000/api/geocoding/history/stats

# Search area
curl -X POST http://localhost:5000/api/geocoding/search-area \
  -H "Content-Type: application/json" \
  -d '{"center": {"lat": 12.37, "lng": -1.52}, "radius": 20, "countryCode": "BF"}'

# AI recommendations
curl -X POST http://localhost:5000/api/geocoding/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{"villageName": "Yaounde", "countryCode": "CM"}'

# Export to Excel
curl -X POST http://localhost:5000/api/export/excel \
  -H "Content-Type: application/json" \
  -d '{"results": [...]}' \
  --output results.xlsx
```

### Node.js (Axios)

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'en'
  }
});

// Single geocoding
async function geocodeSingle(villageName, countryCode) {
  const { data } = await api.post('/geocoding/single', {
    villageName,
    countryCode
  });
  return data;
}

// Batch processing with status polling
async function processBatch(file, columnName, filters) {
  const FormData = require('form-data');
  const fs = require('fs');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(file));
  formData.append('columnName', columnName);
  formData.append('filters', JSON.stringify(filters));
  
  // Start batch job
  const { data: job } = await api.post('/geocoding/batch/upload', formData, {
    headers: formData.getHeaders()
  });
  
  const batchId = job.data.batchId;
  
  // Poll for status
  while (true) {
    const { data: status } = await api.get(`/geocoding/batch/${batchId}/status`);
    
    console.log(`Progress: ${status.data.progress.percentage}%`);
    
    if (status.data.status === 'completed') {
      const { data: results } = await api.get(`/geocoding/batch/${batchId}/results`);
      return results;
    }
    
    if (status.data.status === 'failed') {
      throw new Error('Batch processing failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Get AI insights
async function getAIInsights() {
  const { data } = await api.post('/geocoding/history/ai-insights');
  return data;
}
```

---

## Webhooks (Coming Soon)

Register webhooks to receive notifications for batch processing events.

### Event Types
- `batch_started`: Batch processing has started
- `batch_progress`: Progress update (every 10%)
- `batch_completed`: Batch processing completed
- `batch_failed`: Batch processing failed

### Webhook Payload
```json
{
  "event": "batch_completed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "batchId": "batch_abc123",
    "status": "completed",
    "statistics": {
      "total": 100,
      "found": 85,
      "notFound": 15
    }
  },
  "signature": "sha256=..."
}
```

---

## Support / Assistance

For API support, please contact:
- Email: support@geocoding-app.com
- Documentation: /api/docs
- Status Page: /api/health

Pour l'assistance API, veuillez contacter:
- Email: support@geocoding-app.com
- Documentation: /api/docs
- Page de statut: /api/health
