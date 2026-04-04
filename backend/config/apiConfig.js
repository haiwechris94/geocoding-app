/**
 * API Configuration
 * Configuration des API
 * 
 * Configuration for external geocoding APIs and services.
 * Configuration pour les API et services de géocodage externes.
 */

const apiConfig = {
  // ===========================================
  // Google Maps Geocoding API
  // ===========================================
  googleMaps: {
    baseUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
    enabled: !!process.env.GOOGLE_MAPS_API_KEY,
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    rateLimit: {
      requestsPerSecond: 50,
      requestsPerDay: 40000
    },
    reliability: 0.95, // High reliability score
    priority: 1 // Highest priority
  },

  // ===========================================
  // GeoNames API
  // ===========================================
  geoNames: {
    baseUrl: 'http://api.geonames.org',
    searchEndpoint: '/searchJSON',
    enabled: !!process.env.GEONAMES_USERNAME,
    username: process.env.GEONAMES_USERNAME,
    rateLimit: {
      requestsPerHour: 1000,
      requestsPerDay: 30000
    },
    reliability: 0.85,
    priority: 2
  },

  // ===========================================
  // OpenStreetMap Nominatim API
  // ===========================================
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    searchEndpoint: '/search',
    reverseEndpoint: '/reverse',
    enabled: true, // Always enabled (free)
    email: process.env.NOMINATIM_EMAIL || 'geocoding@example.com',
    rateLimit: {
      requestsPerSecond: 1, // Strict rate limit
      requestsPerDay: 10000
    },
    reliability: 0.80,
    priority: 3,
    userAgent: 'GeocodingApp/1.0'
  },

  // ===========================================
  // HDX (Humanitarian Data Exchange) API
  // ===========================================
  hdx: {
    baseUrl: 'https://data.humdata.org/api/3',
    searchEndpoint: '/action/package_search',
    enabled: !!process.env.HDX_API_KEY,
    apiKey: process.env.HDX_API_KEY,
    rateLimit: {
      requestsPerMinute: 60
    },
    reliability: 0.75,
    priority: 4
  },

  // ===========================================
  // Photon API (Komoot - based on OSM)
  // ===========================================
  photon: {
    baseUrl: 'https://photon.komoot.io/api',
    enabled: true, // Always enabled (free)
    rateLimit: {
      requestsPerSecond: 5
    },
    reliability: 0.78,
    priority: 5
  },

  // ===========================================
  // Mapcarta (based on OSM/Nominatim)
  // ===========================================
  mapcarta: {
    baseUrl: 'https://mapcarta.com',
    enabled: true, // Always enabled (free, uses Nominatim)
    rateLimit: {
      requestsPerSecond: 1
    },
    reliability: 0.79,
    priority: 6
  },

  // ===========================================
  // OpenCage Geocoding API
  // ===========================================
  openCage: {
    baseUrl: 'https://api.opencagedata.com/geocode/v1/json',
    enabled: !!process.env.OPENCAGE_API_KEY,
    apiKey: process.env.OPENCAGE_API_KEY,
    rateLimit: {
      requestsPerDay: 2500 // Free tier limit
    },
    reliability: 0.82,
    priority: 7
  },

  // ===========================================
  // LocationIQ API (Backup)
  // ===========================================
  locationIQ: {
    baseUrl: 'https://us1.locationiq.com/v1/search.php',
    enabled: !!process.env.LOCATIONIQ_API_KEY,
    apiKey: process.env.LOCATIONIQ_API_KEY,
    rateLimit: {
      requestsPerSecond: 2,
      requestsPerDay: 5000
    },
    reliability: 0.82,
    priority: 8
  },

  // ===========================================
  // DeepSeek AI API
  // ===========================================
  deepseek: {
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1',
    enabled: !!process.env.DEEPSEEK_API_KEY,
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek/deepseek-chat',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 10000
    },
    maxTokens: 2000,
    temperature: 0.7
  },

  // ===========================================
  // Overpass API (OpenStreetMap Advanced)
  // ===========================================
  overpass: {
    baseUrl: 'https://overpass-api.de/api/interpreter',
    enabled: true, // Always enabled (free)
    rateLimit: {
      requestsPerMinute: 10
    },
    reliability: 0.88,
    priority: 3
  },

  // ===========================================
  // Wikidata / Wikipedia API
  // ===========================================
  wikidata: {
    baseUrl: 'https://www.wikidata.org/w/api.php',
    sparqlUrl: 'https://query.wikidata.org/sparql',
    enabled: true, // Always enabled (free)
    rateLimit: {
      requestsPerSecond: 5
    },
    reliability: 0.90,
    priority: 2
  },

  // ===========================================
  // Brave Search API
  // ===========================================
  braveSearch: {
    baseUrl: 'https://api.search.brave.com/res/v1/web/search',
    enabled: !!process.env.BRAVE_SEARCH_API_KEY,
    apiKey: process.env.BRAVE_SEARCH_API_KEY,
    rateLimit: {
      requestsPerMonth: 2000
    },
    reliability: 0.65,
    priority: 9
  }
};

// ===========================================
// Confidence Score Weights
// ===========================================
const confidenceWeights = {
  sourceReliability: 0.30,    // Weight for API source reliability
  nameSimilarity: 0.35,       // Weight for name matching (Levenshtein)
  geographicProximity: 0.25,  // Weight for proximity to expected location
  resultConsistency: 0.10    // Weight for consistency across multiple sources
};

// ===========================================
// Geocoding Settings
// ===========================================
const geocodingSettings = {
  // Minimum confidence threshold for automatic acceptance
  minConfidenceThreshold: 0.70,
  
  // High confidence threshold (no manual review needed)
  highConfidenceThreshold: 0.85,
  
  // Maximum number of results to return per query
  maxResultsPerQuery: 5,
  
  // Timeout for API requests (ms)
  apiTimeout: 15000,
  
  // Overall timeout for a single geocode operation on the backend (ms)
  geocodeSingleTimeout: 90000,
  
  // Delay between batch requests (ms) to respect rate limits
  batchDelay: 500,
  
  // Maximum concurrent API requests
  maxConcurrentRequests: 5,
  
  // Enable fuzzy matching for village names
  enableFuzzyMatching: true,
  
  // Maximum Levenshtein distance for fuzzy matching
  maxLevenshteinDistance: 3,
  
  // Default search radius for proximity search (km)
  defaultSearchRadius: 20,
  
  // Available radius options (km)
  radiusOptions: [10, 20, 30, 50, 100]
};

// ===========================================
// Export Configuration
// ===========================================
const exportSettings = {
  excel: {
    sheetName: 'Geocoding Results',
    sheetNameFR: 'Résultats de Géocodage',
    maxRows: 10000
  },
  csv: {
    delimiter: ',',
    encoding: 'utf-8',
    includeHeaders: true
  },
  pdf: {
    pageSize: 'A4',
    orientation: 'landscape',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
    fontSize: 10,
    headerFontSize: 14
  }
};

// ===========================================
// File Upload Settings
// ===========================================
const uploadSettings = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 || 10 * 1024 * 1024, // 10MB default
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
    'text/plain'
  ],
  allowedExtensions: ['.xlsx', '.xls', '.csv', '.txt'],
  uploadDir: process.env.UPLOAD_DIR || './uploads'
};

module.exports = {
  apiConfig,
  confidenceWeights,
  geocodingSettings,
  exportSettings,
  uploadSettings
};
