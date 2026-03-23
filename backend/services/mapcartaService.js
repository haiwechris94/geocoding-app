/**
 * Mapcarta Service
 * Service Mapcarta
 * 
 * Search for locations using Mapcarta (based on OpenStreetMap data)
 * Rechercher des emplacements en utilisant Mapcarta (basé sur les données OpenStreetMap)
 */

const axios = require('axios');

const USER_AGENT = process.env.MAPCARTA_USER_AGENT || 'VillageGeocodingApp/1.0';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

async function rateLimitedRequest(url, params = {}) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  return axios.get(url, {
    params,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    },
    timeout: 10000
  });
}

/**
 * Search for a location using Mapcarta
 * @param {string} query - Search query (village name)
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Search result
 */
async function searchLocation(query, filters = {}) {
  try {
    let searchQuery = query;
    if (filters.country) {
      searchQuery += `, ${filters.country}`;
    }
    if (filters.region) {
      searchQuery += `, ${filters.region}`;
    }

    const params = {
      q: searchQuery,
      format: 'json',
      limit: 5,
      addressdetails: 1,
      'accept-language': filters.language || 'en'
    };

    const response = await rateLimitedRequest(
      'https://nominatim.openstreetmap.org/search',
      params
    );

    if (response.data && response.data.length > 0) {
      const results = response.data;
      const preferredTypes = ['village', 'hamlet', 'town', 'city', 'locality'];
      let bestMatch = results[0];
      
      for (const result of results) {
        if (preferredTypes.includes(result.type)) {
          bestMatch = result;
          break;
        }
      }

      return {
        success: true,
        source: 'mapcarta',
        data: {
          name: query,
          displayName: bestMatch.display_name,
          latitude: parseFloat(bestMatch.lat),
          longitude: parseFloat(bestMatch.lon),
          type: bestMatch.type,
          class: bestMatch.class,
          address: bestMatch.address,
          importance: bestMatch.importance,
          mapcartaUrl: `https://mapcarta.com/${bestMatch.lat},${bestMatch.lon}`
        },
        alternatives: results.slice(1).map(r => ({
          displayName: r.display_name,
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          type: r.type,
          mapcartaUrl: `https://mapcarta.com/${r.lat},${r.lon}`
        }))
      };
    }

    return {
      success: false,
      source: 'mapcarta',
      message: 'No results found',
      query: searchQuery
    };
  } catch (error) {
    console.error('Mapcarta search error:', error.message);
    return {
      success: false,
      source: 'mapcarta',
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
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/status', {
      timeout: 5000
    });
    
    return {
      available: response.status === 200,
      message: 'Mapcarta service is available'
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
  checkStatus
};
