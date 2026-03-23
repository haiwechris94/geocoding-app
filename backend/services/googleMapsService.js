/**
 * Google Maps Geocoding Service
 * Service de Géocodage Google Maps
 * 
 * Search for locations using Google Maps Geocoding API
 * Rechercher des emplacements en utilisant l'API de Géocodage Google Maps
 */

const axios = require('axios');

const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Search for a location using Google Maps Geocoding API
 * @param {string} query - Search query (village name)
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Search result
 */
async function searchLocation(query, filters = {}) {
  try {
    // Check if API key is configured
    if (!API_KEY) {
      return {
        success: false,
        source: 'google_maps',
        message: 'Google Maps API key not configured',
        error: true
      };
    }

    // Build search query with filters
    let searchQuery = query;
    if (filters.country) {
      searchQuery += `, ${filters.country}`;
    }
    if (filters.region) {
      searchQuery += `, ${filters.region}`;
    }

    const params = {
      address: searchQuery,
      key: API_KEY,
      language: filters.language || 'en'
    };

    // Add country restriction if provided
    if (filters.countryCode) {
      params.components = `country:${filters.countryCode}`;
    }

    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params,
      timeout: 10000
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const results = response.data.results;
      const bestMatch = results[0];

      // Extract address components
      const addressComponents = {};
      for (const component of bestMatch.address_components) {
        for (const type of component.types) {
          addressComponents[type] = component.long_name;
        }
      }

      return {
        success: true,
        source: 'google_maps',
        data: {
          name: query,
          displayName: bestMatch.formatted_address,
          latitude: bestMatch.geometry.location.lat,
          longitude: bestMatch.geometry.location.lng,
          type: bestMatch.types[0],
          placeId: bestMatch.place_id,
          address: addressComponents,
          locationType: bestMatch.geometry.location_type,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${bestMatch.geometry.location.lat},${bestMatch.geometry.location.lng}`
        },
        alternatives: results.slice(1, 5).map(r => ({
          displayName: r.formatted_address,
          latitude: r.geometry.location.lat,
          longitude: r.geometry.location.lng,
          type: r.types[0],
          placeId: r.place_id,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${r.geometry.location.lat},${r.geometry.location.lng}`
        }))
      };
    }

    // Handle different error statuses
    const errorMessages = {
      'ZERO_RESULTS': 'No results found',
      'OVER_QUERY_LIMIT': 'API quota exceeded',
      'REQUEST_DENIED': 'API request denied',
      'INVALID_REQUEST': 'Invalid request',
      'UNKNOWN_ERROR': 'Unknown error'
    };

    return {
      success: false,
      source: 'google_maps',
      message: errorMessages[response.data.status] || response.data.status,
      query: searchQuery
    };
  } catch (error) {
    console.error('Google Maps search error:', error.message);
    return {
      success: false,
      source: 'google_maps',
      message: error.message,
      error: true
    };
  }
}

/**
 * Reverse geocode coordinates to get location details
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Location details
 */
async function reverseGeocode(lat, lon) {
  try {
    if (!API_KEY) {
      return {
        success: false,
        source: 'google_maps',
        message: 'Google Maps API key not configured',
        error: true
      };
    }

    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${lat},${lon}`,
        key: API_KEY
      },
      timeout: 10000
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];

      return {
        success: true,
        source: 'google_maps',
        data: {
          displayName: result.formatted_address,
          latitude: lat,
          longitude: lon,
          type: result.types[0],
          placeId: result.place_id,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        }
      };
    }

    return {
      success: false,
      source: 'google_maps',
      message: 'No results found'
    };
  } catch (error) {
    console.error('Google Maps reverse geocode error:', error.message);
    return {
      success: false,
      source: 'google_maps',
      message: error.message,
      error: true
    };
  }
}

/**
 * Check service status
 * @returns {Promise<Object>} Service status
 */
async function checkStatus() {
  if (!API_KEY) {
    return {
      available: false,
      message: 'Google Maps API key not configured'
    };
  }

  try {
    // Test with a simple geocode request
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        address: 'Paris, France',
        key: API_KEY
      },
      timeout: 5000
    });

    return {
      available: response.data.status === 'OK',
      message: response.data.status === 'OK' 
        ? 'Google Maps service is available' 
        : `Service status: ${response.data.status}`
    };
  } catch (error) {
    return {
      available: false,
      message: error.message
    };
  }
}

module.exports = {
  searchLocation,
  reverseGeocode,
  checkStatus
};
