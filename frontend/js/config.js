/**
 * Configuration for the Village Geocoding Application
 */
const CONFIG = {
  // API Base URL - relative path so the CRA dev proxy (package.json "proxy")
  // forwards requests to the local backend. Override with an absolute URL
  // (e.g. https://geocoding-app.onrender.com/api) for production builds.
  API_BASE_URL: '/api',
  
  // Default map center (Cameroon)
  DEFAULT_MAP_CENTER: {
    lat: 7.3697,
    lng: 12.3547
  },
  
  // Default map zoom level
  DEFAULT_MAP_ZOOM: 6,
  
  // Maximum file size for uploads (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Supported file types
  SUPPORTED_FILE_TYPES: ['.csv', '.xlsx', '.xls', '.txt'],
  
  // Available search radii (in km)
  SEARCH_RADII: [10, 20, 30, 50, 100],
  
  // Rate limiting delay between batch requests (ms)
  BATCH_DELAY: 1100, // Slightly over 1 second for Nominatim
  
  // Maximum villages per batch request
  MAX_BATCH_SIZE: 100,
  
  // Toast notification duration (ms)
  TOAST_DURATION: 3000
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
