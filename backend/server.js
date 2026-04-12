/**
 * Main Express Server
 * Serveur Express Principal
 * 
 * This is the entry point for the geocoding backend API.
 * C'est le point d'entrée pour l'API backend de géocodage.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Import routes / Importer les routes
const geocodingRoutes = require('./routes/geocoding');
const villagesRoutes = require('./routes/villages');
const filtersRoutes = require('./routes/filters');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

// ===========================================
// Middleware Configuration / Configuration des Middlewares
// ===========================================

// Security headers / En-têtes de sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration / Configuration CORS
// ---------------------------------------------------------------------------
// Build the allowed-origins list from hard-coded values + optional env vars.
// FRONTEND_URL  – primary override (set this on Render to the Vercel URL)
// EXTRA_ORIGINS – comma-separated list of any additional origins to allow
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173', // Vite dev server
  'https://geocoding-app-three.vercel.app',
];

// Accept additional origins from environment variables
if (process.env.FRONTEND_URL) {
  const envUrl = process.env.FRONTEND_URL.trim().replace(/\/$/, ''); // strip trailing slash
  if (!allowedOrigins.includes(envUrl)) allowedOrigins.push(envUrl);
}
if (process.env.EXTRA_ORIGINS) {
  process.env.EXTRA_ORIGINS.split(',').forEach(function (o) {
    const trimmed = o.trim().replace(/\/$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    // Normalise: strip trailing slash before comparing
    const normOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.indexOf(normOrigin) !== -1) {
      callback(null, normOrigin); // echo the exact origin back (required with credentials:true)
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      callback(null, false); // reject silently — do NOT throw, which would swallow CORS headers
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'], // needed for file-download responses
  credentials: true,
  optionsSuccessStatus: 204, // some legacy browsers choke on 204 vs 200 — 204 is correct for preflight
  maxAge: 86400 // cache preflight for 24 hours
};

// Handle ALL preflight OPTIONS requests BEFORE any other middleware (helmet, rate-limiter, etc.)
// This is the most common reason CORS headers are missing on preflight responses.
app.options('*', cors(corsOptions));

// Apply CORS to all other requests
app.use(cors(corsOptions));

// Request logging / Journalisation des requêtes
app.use(morgan('dev'));

// Body parsing / Analyse du corps des requêtes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting / Limitation de débit
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: {
      en: 'Too many requests, please try again later.',
      fr: 'Trop de requêtes, veuillez réessayer plus tard.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Batch Processing rate limiter / Limitation de débit pour le traitement par lots
const batchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    error: {
      en: 'Too many batch requests, please try again later.',
      fr: 'Trop de requêtes par lots, veuillez réessayer plus tard.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/geocoding/batch', batchLimiter);

// Create uploads directory if it doesn't exist
// Créer le répertoire uploads s'il n'existe pas
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads / Servir les fichiers statiques depuis uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================================
// API Routes / Routes API
// ===========================================

app.use('/api/geocoding', geocodingRoutes);
app.use('/api/villages', villagesRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/export', exportRoutes);

// ===========================================
// Geocoding Sources Status / Statut des Sources de Géocodage
// ===========================================

app.get('/api/sources/status', (req, res) => {
  try {
    const { apiConfig } = require('./config/apiConfig');

    const sources = [
      {
        id: 'googleMaps',
        name: 'Google Maps',
        reliability: apiConfig.googleMaps.reliability,
        operational: apiConfig.googleMaps.enabled,
        reason: apiConfig.googleMaps.enabled ? null : {
          en: 'API key not configured (GOOGLE_MAPS_API_KEY)',
          fr: 'Clé API non configurée (GOOGLE_MAPS_API_KEY)'
        }
      },
      {
        id: 'geoNames',
        name: 'GeoNames',
        reliability: apiConfig.geoNames.reliability,
        operational: apiConfig.geoNames.enabled,
        reason: apiConfig.geoNames.enabled ? null : {
          en: 'Username not configured (GEONAMES_USERNAME)',
          fr: "Nom d'utilisateur non configuré (GEONAMES_USERNAME)"
        }
      },
      {
        id: 'nominatim',
        name: 'Nominatim (OpenStreetMap)',
        reliability: apiConfig.nominatim.reliability,
        operational: apiConfig.nominatim.enabled,
        reason: null
      },
      {
        id: 'hdx',
        name: 'HDX — Humanitarian Data Exchange',
        reliability: apiConfig.hdx.reliability,
        operational: apiConfig.hdx.enabled,
        reason: apiConfig.hdx.enabled ? null : {
          en: 'API key not configured (HDX_API_KEY)',
          fr: 'Clé API non configurée (HDX_API_KEY)'
        }
      },
      {
        id: 'photon',
        name: 'Photon (Komoot)',
        reliability: apiConfig.photon.reliability,
        operational: apiConfig.photon.enabled,
        reason: null
      },
      {
        id: 'mapcarta',
        name: 'Mapcarta',
        reliability: apiConfig.mapcarta.reliability,
        operational: apiConfig.mapcarta.enabled,
        reason: null
      },
      {
        id: 'openCage',
        name: 'OpenCage',
        reliability: apiConfig.openCage.reliability,
        operational: apiConfig.openCage.enabled,
        reason: apiConfig.openCage.enabled ? null : {
          en: 'API key not configured (OPENCAGE_API_KEY)',
          fr: 'Clé API non configurée (OPENCAGE_API_KEY)'
        }
      },
      {
        id: 'locationIQ',
        name: 'LocationIQ',
        reliability: apiConfig.locationIQ.reliability,
        operational: apiConfig.locationIQ.enabled,
        reason: apiConfig.locationIQ.enabled ? null : {
          en: 'API key not configured (LOCATIONIQ_API_KEY)',
          fr: 'Clé API non configurée (LOCATIONIQ_API_KEY)'
        }
      },
      {
        id: 'deepseek',
        name: 'DeepSeek AI',
        reliability: null,
        operational: apiConfig.deepseek.enabled,
        reason: apiConfig.deepseek.enabled ? null : {
          en: 'API key not configured (DEEPSEEK_API_KEY)',
          fr: 'Clé API non configurée (DEEPSEEK_API_KEY)'
        }
      },
      {
        id: 'overpass',
        name: 'Overpass (OpenStreetMap Avancé)',
        reliability: 0.88,
        operational: true,
        reason: null
      },
      {
        id: 'wikidata',
        name: 'Wikidata / Wikipedia',
        reliability: 0.90,
        operational: true,
        reason: null
      },
      {
        id: 'braveSearch',
        name: 'Brave Search',
        reliability: 0.65,
        operational: !!process.env.BRAVE_SEARCH_API_KEY,
        reason: process.env.BRAVE_SEARCH_API_KEY ? null : {
          en: 'API key not configured (BRAVE_SEARCH_API_KEY)',
          fr: 'Clé API non configurée (BRAVE_SEARCH_API_KEY)'
        }
      },
      {
        id: 'geoAgent',
        name: 'GeoAgent IA',
        reliability: 0.95,
        operational: true,
        reason: null
      }
    ];

    res.json({ success: true, data: sources });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import additional services
const monitoringService = require('./services/monitoringService');
const webhookService = require('./services/webhookService');
const reportingService = require('./services/reportingService');
const cacheService = require('./services/cacheService');

// ===========================================
// Admin/Monitoring Routes / Routes Admin/Surveillance
// ===========================================

// Get system status
app.get('/api/admin/monitoring/status', (req, res) => {
  try {
    const status = monitoringService.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get API usage statistics
app.get('/api/admin/monitoring/usage', (req, res) => {
  try {
    const usage = monitoringService.getAPIUsageStats(req.query);
    res.json({ success: true, data: usage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get error statistics
app.get('/api/admin/monitoring/errors', (req, res) => {
  try {
    const errors = monitoringService.getErrorStats(req.query);
    res.json({ success: true, data: errors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent activity
app.get('/api/admin/monitoring/activity', (req, res) => {
  try {
    const activity = monitoringService.getRecentActivity(parseInt(req.query.limit) || 50);
    res.json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cache statistics
app.get('/api/admin/cache/stats', (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear cache
app.post('/api/admin/cache/clear', (req, res) => {
  try {
    const { prefix } = req.body;
    if (prefix) {
      cacheService.clearByPrefix(prefix);
    } else {
      cacheService.clear();
    }
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// Webhook Routes / Routes Webhook
// ===========================================

// Register webhook
app.post('/api/webhooks', (req, res) => {
  try {
    const webhook = webhookService.registerWebhook(req.body);
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all webhooks
app.get('/api/webhooks', (req, res) => {
  try {
    const webhooks = webhookService.getWebhooks();
    res.json({ success: true, data: webhooks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get webhook by ID
app.get('/api/webhooks/:id', (req, res) => {
  try {
    const webhook = webhookService.getWebhook(req.params.id);
    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update webhook
app.put('/api/webhooks/:id', (req, res) => {
  try {
    const webhook = webhookService.updateWebhook(req.params.id, req.body);
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete webhook
app.delete('/api/webhooks/:id', (req, res) => {
  try {
    const deleted = webhookService.deleteWebhook(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test webhook
app.post('/api/webhooks/:id/test', async (req, res) => {
  try {
    const result = await webhookService.testWebhook(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get webhook logs
app.get('/api/webhooks/logs', (req, res) => {
  try {
    const logs = webhookService.getWebhookLogs(req.query);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// Report Routes / Routes Rapport
// ===========================================

// Generate report
app.post('/api/export/report', async (req, res) => {
  try {
    const { type, data, options, format } = req.body;
    const report = await reportingService.generateReport(type, data, options, format);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get report templates
app.get('/api/export/templates', (req, res) => {
  try {
    const templates = reportingService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List generated reports
app.get('/api/export/reports', (req, res) => {
  try {
    const reports = reportingService.listReports();
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// Health Check Endpoint / Point de Terminaison de Santé
// ===========================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: {
      en: 'Geocoding API is running',
      fr: 'L\'API de géocodage fonctionne'
    }
  });
});

// Root endpoint / Point de terminaison racine
app.get('/', (req, res) => {
  res.json({
    name: 'Geocoding API / API de Géocodage',
    version: '2.0.0',
    description: {
      en: 'Bilingual VillagePoint geocoding API with AI features',
      fr: 'API bilingue de géocodage VillagePoint avec fonctionnalités IA'
    },
    endpoints: {
      health: '/api/health',
      geocoding: '/api/geocoding',
      villages: '/api/villages',
      filters: '/api/filters',
      export: '/api/export',
      webhooks: '/api/webhooks',
      admin: '/api/admin'
    },
    documentation: '/api/docs'
  });
});

// GeoAgent routes
const { geoAgent, suggestSimilarVillages } = require('./services/geoAgent');

app.get('/api/ai-geocode', async (req, res) => {
  try {
    const { village, country } = req.query;
    if (!village) return res.status(400).json({ success: false, error: 'village is required' });
    const result = await geoAgent(village, country || '');
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/ai-suggest', async (req, res) => {
  try {
    const { village, country } = req.query;
    if (!village) return res.status(400).json({ success: false, error: 'village is required' });
    const result = await suggestSimilarVillages(village, country || '');
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ===========================================
// Error Handling Middleware / Middleware de Gestion des Erreurs
// ===========================================

// 404 Handler / Gestionnaire 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: {
        en: `Route ${req.originalUrl} not found`,
        fr: `Route ${req.originalUrl} non trouvée`
      }
    }
  });
});

// Global error handler / Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer file size error / Erreur de taille de fichier Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: {
          en: 'File size exceeds the maximum limit',
          fr: 'La taille du fichier dépasse la limite maximale'
        }
      }
    });
  }

  // Validation error / Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: {
          en: err.message,
          fr: 'Erreur de validation des données'
        },
        details: err.details || []
      }
    });
  }

  // Default error response / Réponse d'erreur par défaut
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: {
        en: statusCode === 500 ? 'Internal server error' : err.message,
        fr: statusCode === 500 ? 'Erreur interne du serveur' : err.message
      },
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// ===========================================
// Server Startup / Démarrage du Serveur
// ===========================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🌍 Geocoding API Server / Serveur API de Géocodage 🌍    ║
║                                                            ║
║   Server running on port ${PORT}                             ║
║   Serveur en cours d'exécution sur le port ${PORT}           ║
║                                                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   Environnement: ${process.env.NODE_ENV || 'development'}                        ║
║                                                            ║
║   API URL: http://localhost:${PORT}                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;