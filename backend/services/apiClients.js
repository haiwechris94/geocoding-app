/**
 * API Clients for Geocoding Services
 * Clients API pour les Services de Géocodage
 * 
 * Functions to interact with various geocoding APIs.
 * Fonctions pour interagir avec diverses API de géocodage.
 */

const axios = require('axios');
const { apiConfig, geocodingSettings } = require('../config/apiConfig');
const opencageService = require('./opencageService');

/**
 * Create axios instance with timeout
 * Créer une instance axios avec timeout
 */
const createClient = (baseURL, headers = {}) => {
  return axios.create({
    baseURL,
    timeout: geocodingSettings.apiTimeout,
    headers: {
      'Accept': 'application/json',
      ...headers
    }
  });
};

// ===========================================
// Google Maps Geocoding API Client
// ===========================================

/**
 * Geocode using Google Maps API
 * Géocoder avec l'API Google Maps
 * 
 * @param {string} query - Village name to geocode
 * @param {Object} filters - Geographic filters (country, region, etc.)
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeWithGoogle = async (query, filters = {}) => {
  if (!apiConfig.googleMaps.enabled) {
    return null;
  }

  try {
    const client = createClient(apiConfig.googleMaps.baseUrl);
    
    // Build address query with filters
    let address = query;
    if (filters.country) {
      address += `, ${filters.country}`;
    }
    if (filters.region) {
      address += `, ${filters.region}`;
    }

    const response = await client.get('', {
      params: {
        address,
        key: apiConfig.googleMaps.apiKey,
        language: filters.language || 'en'
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        source: 'Google Maps',
        sourceFR: 'Google Maps',
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        types: result.types,
        reliability: apiConfig.googleMaps.reliability,
        raw: result
      };
    }

    return null;
  } catch (error) {
    console.error('Google Maps API error:', error.message);
    return null;
  }
};

// ===========================================
// GeoNames API Client
// ===========================================

/**
 * Geocode using GeoNames API
 * Géocoder avec l'API GeoNames
 * 
 * @param {string} query - Village name to geocode
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeWithGeoNames = async (query, filters = {}) => {
  if (!apiConfig.geoNames.enabled) {
    return null;
  }

  try {
    const client = createClient(apiConfig.geoNames.baseUrl);
    
    const params = {
      q: query,
      username: apiConfig.geoNames.username,
      maxRows: 5,
      featureClass: 'P', // Populated places
      style: 'FULL'
    };

    // Add country filter if provided
    if (filters.countryCode) {
      params.country = filters.countryCode;
    }

    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });

    if (response.data.geonames && response.data.geonames.length > 0) {
      const result = response.data.geonames[0];
      return {
        source: 'GeoNames',
        sourceFR: 'GeoNames',
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lng),
        formattedAddress: `${result.name}, ${result.adminName1 || ''}, ${result.countryName}`.trim(),
        geonameId: result.geonameId,
        population: result.population,
        featureCode: result.fcode,
        adminName1: result.adminName1,
        adminName2: result.adminName2,
        countryCode: result.countryCode,
        reliability: apiConfig.geoNames.reliability,
        raw: result
      };
    }

    return null;
  } catch (error) {
    console.error('GeoNames API error:', error.message);
    return null;
  }
};

// ===========================================
// OpenStreetMap Nominatim API Client
// ===========================================

/**
 * Geocode using Nominatim API
 * Géocoder avec l'API Nominatim
 * 
 * @param {string} query - Village name to geocode
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeWithNominatim = async (query, filters = {}) => {
  try {
    const client = createClient(apiConfig.nominatim.baseUrl, {
      'User-Agent': apiConfig.nominatim.userAgent
    });

    const params = {
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 5,
      email: apiConfig.nominatim.email
    };

    // Add country filter if provided
    if (filters.countryCode) {
      params.countrycodes = filters.countryCode.toLowerCase();
    }

    // Add viewbox for geographic bounds if provided
    if (filters.bounds) {
      params.viewbox = `${filters.bounds.west},${filters.bounds.south},${filters.bounds.east},${filters.bounds.north}`;
      params.bounded = 1;
    }

    const response = await client.get(apiConfig.nominatim.searchEndpoint, { params });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        source: 'OpenStreetMap',
        sourceFR: 'OpenStreetMap',
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
        osmId: result.osm_id,
        osmType: result.osm_type,
        placeRank: result.place_rank,
        importance: result.importance,
        address: result.address,
        reliability: apiConfig.nominatim.reliability,
        raw: result
      };
    }

    return null;
  } catch (error) {
    console.error('Nominatim API error:', error.message);
    return null;
  }
};

// ===========================================
// Photon API Client (Komoot)
// ===========================================

/**
 * Geocode using Photon API
 * Géocoder avec l'API Photon
 * 
 * @param {string} query - Village name to geocode
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeWithPhoton = async (query, filters = {}) => {
  try {
    const client = createClient(apiConfig.photon.baseUrl);

    const params = {
      q: query,
      limit: 5
    };

    // Add location bias if provided
    if (filters.lat && filters.lng) {
      params.lat = filters.lat;
      params.lon = filters.lng;
    }

    // Add language preference
    if (filters.language) {
      params.lang = filters.language;
    }

    const response = await client.get('', { params });

    if (response.data.features && response.data.features.length > 0) {
      const result = response.data.features[0];
      const props = result.properties;
      
      return {
        source: 'Photon (OSM)',
        sourceFR: 'Photon (OSM)',
        latitude: result.geometry.coordinates[1],
        longitude: result.geometry.coordinates[0],
        formattedAddress: [props.name, props.city, props.state, props.country].filter(Boolean).join(', '),
        osmId: props.osm_id,
        osmType: props.osm_type,
        city: props.city,
        state: props.state,
        country: props.country,
        reliability: apiConfig.photon.reliability,
        raw: result
      };
    }

    return null;
  } catch (error) {
    console.error('Photon API error:', error.message);
    return null;
  }
};

// ===========================================
// HDX API Client
// ===========================================

/**
 * Search HDX for geographic datasets
 * Rechercher des jeux de données géographiques sur HDX
 * 
 * @param {string} query - Search query
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Search results
 */
const searchHDX = async (query, filters = {}) => {
  if (!apiConfig.hdx.enabled) {
    return null;
  }

  try {
    const client = createClient(apiConfig.hdx.baseUrl, {
      'Authorization': apiConfig.hdx.apiKey
    });

    const params = {
      q: `${query} ${filters.country || ''}`.trim(),
      fq: 'organization:*',
      rows: 10
    };

    const response = await client.get(apiConfig.hdx.searchEndpoint, { params });

    if (response.data.success && response.data.result.results.length > 0) {
      return {
        source: 'HDX',
        sourceFR: 'HDX',
        datasets: response.data.result.results.map(r => ({
          id: r.id,
          name: r.name,
          title: r.title,
          organization: r.organization?.title,
          resources: r.resources?.length || 0
        })),
        reliability: apiConfig.hdx.reliability
      };
    }

    return null;
  } catch (error) {
    console.error('HDX API error:', error.message);
    return null;
  }
};

// ===========================================
// Aggregated Geocoding Function
// ===========================================

/**
 * Geocode using all available APIs in parallel
 * Géocoder en utilisant toutes les API disponibles en parallèle
 * 
 * @param {string} query - Village name to geocode
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Array>} Array of results from all APIs
 */
const geocodeWithAllAPIs = async (query, filters = {}) => {
  const overpassService = require('./overpassService');
  const wikidataService = require('./wikidataService');
  const braveSearchService = require('./braveSearchService');
  const { geoAgent } = require('./geoAgent');

  // Extract village name and country from query/filters
  const villageName = query.split(',')[0].trim();
  const country = filters.country || filters.countryCode || '';

  const promises = [
    geocodeWithGoogle(query, filters),
    geocodeWithGeoNames(query, filters),
    geocodeWithNominatim(query, filters),
    geocodeWithPhoton(query, filters),
    geocodeWithOpenCage(query, filters),
    // New sources
    overpassService.searchVillageGlobal(villageName, filters.countryCode || null)
      .then(results => results.map(r => ({
        source: r.source,
        sourceFR: r.source,
        latitude: r.latitude,
        longitude: r.longitude,
        formattedAddress: r.label || r.villageName,
        country: r.country,
        region: r.region,
        reliability: 0.88,
        raw: r
      }))).catch(() => []),
    wikidataService.geocodeVillage(villageName, country)
      .then(results => results.map(r => ({
        source: r.source,
        sourceFR: r.source,
        latitude: r.latitude,
        longitude: r.longitude,
        formattedAddress: r.label || r.villageName,
        country: r.country,
        reliability: 0.90,
        raw: r
      }))).catch(() => []),
    braveSearchService.searchVillage(villageName, country)
      .then(results => results.map(r => ({
        source: r.source,
        sourceFR: r.source,
        latitude: r.latitude,
        longitude: r.longitude,
        formattedAddress: r.label || r.villageName,
        reliability: 0.65,
        raw: r
      }))).catch(() => []),
  ];

  const settled = await Promise.allSettled(promises);
  
  // Flatten results (some sources return arrays, others single objects)
  const allResults = [];
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value !== null) {
      if (Array.isArray(r.value)) {
        allResults.push(...r.value.filter(Boolean));
      } else {
        allResults.push(r.value);
      }
    }
  }
  return allResults;
};

// ===========================================
// OpenCage Geocoding API Client
// ===========================================

/**
 * Geocode using OpenCage API
 * Géocoder avec l'API OpenCage
 * 
 * @param {string} query - Village name to geocode
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeWithOpenCage = async (query, filters = {}) => {
  if (!apiConfig.openCage?.enabled) {
    return null;
  }

  try {
    const results = await opencageService.geocode(query, filters, filters.language || 'en');
    
    if (results && results.length > 0) {
      // Return the first/best result in the standard format
      const result = results[0];
      return {
        source: 'OpenCage',
        sourceFR: 'OpenCage',
        latitude: result.latitude,
        longitude: result.longitude,
        formattedAddress: result.formattedAddress,
        country: result.country,
        countryCode: result.countryCode,
        region: result.region,
        department: result.department,
        reliability: result.reliability,
        raw: result.raw
      };
    }

    return null;
  } catch (error) {
    console.error('OpenCage API error:', error.message);
    return null;
  }
};

// ===========================================
// Reverse Geocoding
// ===========================================

/**
 * Reverse geocode coordinates to address
 * Géocodage inverse des coordonnées vers une adresse
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Address information
 */
const reverseGeocode = async (lat, lng) => {
  try {
    const client = createClient(apiConfig.nominatim.baseUrl, {
      'User-Agent': apiConfig.nominatim.userAgent
    });

    const response = await client.get(apiConfig.nominatim.reverseEndpoint, {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1,
        email: apiConfig.nominatim.email
      }
    });

    if (response.data) {
      return {
        source: 'OpenStreetMap',
        formattedAddress: response.data.display_name,
        address: response.data.address,
        raw: response.data
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
};

module.exports = {
  geocodeWithGoogle,
  geocodeWithGeoNames,
  geocodeWithNominatim,
  geocodeWithPhoton,
  geocodeWithOpenCage,
  searchHDX,
  geocodeWithAllAPIs,
  reverseGeocode
};
