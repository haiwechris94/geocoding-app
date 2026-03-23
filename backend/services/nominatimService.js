const axios = require('axios');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'VillageGeocodingApp/1.0';

// Rate limiting - Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function rateLimitedRequest(url, params) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  return axios.get(url, {
    params,
    headers: {
      'User-Agent': USER_AGENT
    }
  });
}

/**
 * Geocode a village name using Nominatim
 * @param {string} villageName - Name of the village
 * @param {Object} filters - Geographic filters (country, region, department, district)
 * @returns {Promise<Object>} Geocoding result
 */
async function geocodeVillage(villageName, filters = {}) {
  try {
    // Build query string with filters
    let query = villageName;
    const queryParts = [villageName];
    
    if (filters.district) queryParts.push(filters.district);
    if (filters.department) queryParts.push(filters.department);
    if (filters.region) queryParts.push(filters.region);
    if (filters.country) queryParts.push(filters.country);
    
    query = queryParts.join(', ');
    
    const params = {
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 5,
      'accept-language': 'en'
    };
    
    // Add country code if provided
    if (filters.countryCode) {
      params.countrycodes = filters.countryCode;
    }
    
    const response = await rateLimitedRequest(`${NOMINATIM_BASE_URL}/search`, params);
    
    if (response.data && response.data.length > 0) {
      // Filter results to prefer villages, hamlets, towns
      const preferredTypes = ['village', 'hamlet', 'town', 'city', 'locality', 'suburb'];
      let bestMatch = response.data[0];
      
      for (const result of response.data) {
        if (preferredTypes.includes(result.type)) {
          bestMatch = result;
          break;
        }
      }
      
      return {
        success: true,
        source: 'nominatim',
        data: {
          name: villageName,
          displayName: bestMatch.display_name,
          latitude: parseFloat(bestMatch.lat),
          longitude: parseFloat(bestMatch.lon),
          type: bestMatch.type,
          class: bestMatch.class,
          address: bestMatch.address,
          boundingBox: bestMatch.boundingbox,
          importance: bestMatch.importance
        },
        alternatives: response.data.slice(1).map(r => ({
          displayName: r.display_name,
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          type: r.type
        }))
      };
    }
    
    return {
      success: false,
      source: 'nominatim',
      message: 'No results found',
      query: query
    };
  } catch (error) {
    console.error('Nominatim geocoding error:', error.message);
    return {
      success: false,
      source: 'nominatim',
      message: error.message,
      error: true
    };
  }
}

/**
 * Reverse geocode coordinates to get location details
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Reverse geocoding result
 */
async function reverseGeocode(lat, lon) {
  try {
    const params = {
      lat,
      lon,
      format: 'json',
      addressdetails: 1,
      zoom: 18
    };
    
    const response = await rateLimitedRequest(`${NOMINATIM_BASE_URL}/reverse`, params);
    
    if (response.data) {
      return {
        success: true,
        source: 'nominatim',
        data: {
          displayName: response.data.display_name,
          latitude: parseFloat(response.data.lat),
          longitude: parseFloat(response.data.lon),
          address: response.data.address,
          type: response.data.type
        }
      };
    }
    
    return {
      success: false,
      source: 'nominatim',
      message: 'No results found'
    };
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error.message);
    return {
      success: false,
      source: 'nominatim',
      message: error.message,
      error: true
    };
  }
}

/**
 * Search for places within a bounding box
 * @param {Object} bounds - Bounding box {north, south, east, west}
 * @param {string} query - Search query
 * @returns {Promise<Object>} Search results
 */
async function searchInBounds(bounds, query = '') {
  try {
    const params = {
      format: 'json',
      addressdetails: 1,
      limit: 50,
      viewbox: `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`,
      bounded: 1
    };
    
    if (query) {
      params.q = query;
    }
    
    const response = await rateLimitedRequest(`${NOMINATIM_BASE_URL}/search`, params);
    
    return {
      success: true,
      source: 'nominatim',
      data: response.data.map(r => ({
        displayName: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        type: r.type,
        address: r.address
      }))
    };
  } catch (error) {
    console.error('Nominatim bounds search error:', error.message);
    return {
      success: false,
      source: 'nominatim',
      message: error.message,
      error: true
    };
  }
}

module.exports = {
  geocodeVillage,
  reverseGeocode,
  searchInBounds
};
