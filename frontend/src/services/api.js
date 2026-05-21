import axios from 'axios';

// In development the CRA proxy (package.json "proxy": "http://localhost:5000")
// forwards /api/* requests to the local backend, so a relative base path is
// all that is needed. In production, set REACT_APP_API_URL to the deployed
// backend origin (e.g. https://geocoding-app.onrender.com/api).
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add language header
api.interceptors.request.use((config) => {
  const language = localStorage.getItem('language') || 'en';
  config.headers['Accept-Language'] = language;
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      console.error('API Timeout Error:', error.message);
      error.isTimeout = true;
      error.userMessage = 'The geocoding request timed out. The server may be processing a large batch or external APIs are slow. Please try again.';
    } else {
      console.error('API Error:', error);
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Geocoding API
// ==========================================

export const geocodingAPI = {
  // Upload file
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/geocoding/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Batch geocode from file
  batchGeocodeFromFile: async (filePath, columnName, filters) => {
    const response = await api.post('/geocoding/batch', {
      filePath,
      columnName,
      filters
    }, { timeout: 120000 });
    return response.data;
  },

  // Batch geocode manual entry
  batchGeocodeManual: async (villages, filters) => {
    const response = await api.post('/geocoding/batch-manual', {
      villages,
      filters
    }, { timeout: 120000 });
    return response.data;
  },

  // Single village geocode
  geocodeSingle: async (villageName, filters) => {
    const response = await api.post('/geocoding/single', { villageName, filters }, { timeout: 120000 });
    return response.data;
  },

  // Get file columns
  getFileColumns: async (filePath) => {
    const response = await api.get('/geocoding/columns', {
      params: { filePath }
    });
    return response.data;
  },

  // Get geocoding sources status
  getSourcesStatus: async () => {
    const response = await api.get('/geocoding/sources/status');
    return response.data;
  }
};

// ==========================================
// Villages API
// ==========================================

export const villagesAPI = {
  // Search village
  search: async (name, filters = {}) => {
    const response = await api.get('/villages/search', {
      params: { name, ...filters }
    });
    return response.data;
  },

  // Get suggestions
  getSuggestions: async (query, countryCode, limit = 5) => {
    const response = await api.get('/villages/suggestions', {
      params: { query, countryCode, limit }
    });
    return response.data;
  },

  // Validate coordinates
  validateCoordinates: async (villageName, latitude, longitude, countryCode) => {
    const response = await api.post('/villages/validate', {
      villageName,
      latitude,
      longitude,
      countryCode
    });
    return response.data;
  }
};

// ==========================================
// Filters API
// ==========================================

export const filtersAPI = {
  // Get all countries
  getCountries: async () => {
    const response = await api.get('/filters/countries');
    return response.data;
  },

  // Get regions for country
  getRegions: async (countryCode) => {
    const response = await api.get(`/filters/regions/${countryCode}`);
    return response.data;
  },

  // Get departments for region
  getDepartments: async (regionId) => {
    const response = await api.get(`/filters/departments/${regionId}`);
    return response.data;
  },

  // Get arrondissements for department
  getArrondissements: async (departmentId) => {
    const response = await api.get(`/filters/arrondissements/${departmentId}`);
    return response.data;
  },

  // Get radius options
  getRadiusOptions: async () => {
    const response = await api.get('/filters/radius-options');
    return response.data;
  },

  // Search divisions
  searchDivisions: async (query, countryCode) => {
    const response = await api.get('/filters/search', {
      params: { query, countryCode }
    });
    return response.data;
  }
};

// ==========================================
// Export API
// ==========================================

// Longer timeout for export endpoints — file generation can be slow on cold starts
const EXPORT_TIMEOUT = 90000; // 90 seconds

export const exportAPI = {
  // Export to Excel
  exportToExcel: async (results, filters) => {
    const response = await api.post('/export/excel', { results, filters }, {
      responseType: 'blob',
      timeout: EXPORT_TIMEOUT
    });
    return response;
  },

  // Export to CSV
  exportToCSV: async (results, filters) => {
    const response = await api.post('/export/csv', { results, filters }, {
      responseType: 'blob',
      timeout: EXPORT_TIMEOUT
    });
    return response;
  },

  // Export to PDF
  exportToPDF: async (results, filters) => {
    const response = await api.post('/export/pdf', { results, filters }, {
      responseType: 'blob',
      timeout: EXPORT_TIMEOUT
    });
    return response;
  },

  // Get export formats
  getFormats: async () => {
    const response = await api.get('/export/formats');
    return response.data;
  }
};

// ==========================================
// Proximity API
// ==========================================

export const proximityAPI = {
  // Search by radius
  searchByRadius: async (latitude, longitude, radius, villages) => {
    const response = await api.post('/proximity/radius', {
      latitude,
      longitude,
      radius,
      villages
    });
    return response.data;
  },

  // Get distance between points
  getDistance: async (lat1, lng1, lat2, lng2) => {
    const response = await api.get('/proximity/distance', {
      params: { lat1, lng1, lat2, lng2 }
    });
    return response.data;
  }
};

// ==========================================
// AI API
// ==========================================

export const aiAPI = {
  // Get AI recommendations for search
  getRecommendations: async (query, context = {}) => {
    const response = await api.post('/geocoding/ai/recommend', {
      query,
      context
    });
    return response.data;
  },

  // Get AI name suggestions
  getNameSuggestions: async (villageName, countryCode = '', similarNames = []) => {
    const response = await api.post('/geocoding/ai/suggest-names', {
      villageName,
      countryCode,
      similarNames
    });
    return response.data;
  },

  // Explain confidence scores with AI
  explainConfidence: async (confidenceDetails, villageName) => {
    const response = await api.post('/geocoding/ai/explain-confidence', {
      confidenceDetails,
      villageName
    });
    return response.data;
  },

  // Get result context with AI
  getResultContext: async (result, originalQuery) => {
    const response = await api.post('/geocoding/ai/result-context', {
      result,
      originalQuery
    });
    return response.data;
  },

  // Check AI service status
  getStatus: async () => {
    const response = await api.get('/geocoding/ai/status');
    return response.data;
  },

  // Get village information with AI
  getVillageInfo: async (villageName, latitude, longitude) => {
    const response = await api.post('/geocoding/village-info', {
      villageName,
      latitude,
      longitude
    });
    return response.data;
  }
};

// ==========================================
// Search Area API
// ==========================================

export const searchAreaAPI = {
  // Search for all locations within radius
  searchArea: async (villageName, center, radius, countryCode = null) => {
    // Ensure radius is a number
    const numericRadius = typeof radius === 'number' ? radius : parseInt(radius, 10) || 20;
    
    console.log('[API] searchArea called with:', { villageName, center, radius: numericRadius, countryCode });
    
    const response = await api.post('/geocoding/search-area', {
      villageName,
      center,
      radius: numericRadius,
      filters: countryCode ? { countryCode } : {}
    });
    return response.data;
  }
};

// ==========================================
// Search History API
// ==========================================

export const searchHistoryAPI = {
  // Get search history
  getHistory: async (options = {}) => {
    const response = await api.get('/geocoding/history', { params: options });
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get('/geocoding/history/stats');
    return response.data;
  },

  // Get AI insights
  getAIInsights: async () => {
    const response = await api.post('/geocoding/history/ai-insights');
    return response.data;
  },

  // Delete history entry
  deleteEntry: async (id) => {
    const response = await api.delete(`/geocoding/history/${id}`);
    return response.data;
  },

  // Clear all history
  clearAll: async () => {
    const response = await api.delete('/geocoding/history');
    return response.data;
  },

  // Export history
  exportHistory: async (format = 'json') => {
    const response = await api.get('/geocoding/history/export', {
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json'
    });
    return response;
  }
};

// ==========================================
// GeoAgent API
// ==========================================
export const geoAgentAPI = {
  geocode: async (village, country = '') => {
    const response = await api.get('/ai-geocode', { params: { village, country } });
    return response.data;
  },
  suggest: async (village, country = '') => {
    const response = await api.get('/ai-suggest', { params: { village, country } });
    return response.data;
  }
};

export default api;