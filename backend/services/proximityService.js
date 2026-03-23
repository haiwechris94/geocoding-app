/**
 * Proximity Service
 * Service de Proximité
 * 
 * Calculate distances and filter results by radius using Turf.js.
 * Calculer les distances et filtrer les résultats par rayon avec Turf.js.
 */

const turf = require('@turf/turf');
const { geocodingSettings } = require('../config/apiConfig');

/**
 * Calculate distance between two points
 * Calculer la distance entre deux points
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @param {string} units - Units ('kilometers', 'miles', 'meters')
 * @returns {number} Distance in specified units
 */
const calculateDistance = (lat1, lng1, lat2, lng2, units = 'kilometers') => {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units });
};

/**
 * Check if a point is within a radius from center
 * Vérifier si un point est dans un rayon depuis le centre
 * 
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} pointLat - Point latitude
 * @param {number} pointLng - Point longitude
 * @param {number} radius - Radius in kilometers
 * @returns {boolean} True if point is within radius
 */
const isWithinRadius = (centerLat, centerLng, pointLat, pointLng, radius) => {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radius;
};

/**
 * Filter results by radius from center point
 * Filtrer les résultats par rayon depuis un point central
 * 
 * @param {Array} results - Array of geocoding results with lat/lng
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radius - Radius in kilometers
 * @returns {Array} Filtered results with distance added
 */
const filterByRadius = (results, centerLat, centerLng, radius) => {
  return results
    .map(result => {
      const distance = calculateDistance(
        centerLat, centerLng,
        result.latitude, result.longitude
      );
      return {
        ...result,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        distanceUnit: 'km'
      };
    })
    .filter(result => result.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Create a circular buffer around a point
 * Créer un tampon circulaire autour d'un point
 * 
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radius - Radius in kilometers
 * @param {number} steps - Number of steps for circle approximation
 * @returns {Object} GeoJSON polygon representing the buffer
 */
const createBuffer = (lat, lng, radius, steps = 64) => {
  const center = turf.point([lng, lat]);
  const buffer = turf.buffer(center, radius, { units: 'kilometers', steps });
  return buffer;
};

/**
 * Get bounding box for a radius around a point
 * Obtenir la boîte englobante pour un rayon autour d'un point
 * 
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radius - Radius in kilometers
 * @returns {Object} Bounding box { north, south, east, west }
 */
const getBoundingBox = (lat, lng, radius) => {
  const center = turf.point([lng, lat]);
  const buffer = turf.buffer(center, radius, { units: 'kilometers' });
  const bbox = turf.bbox(buffer);
  
  return {
    west: bbox[0],
    south: bbox[1],
    east: bbox[2],
    north: bbox[3]
  };
};

/**
 * Find nearest point from a list
 * Trouver le point le plus proche d'une liste
 * 
 * @param {number} targetLat - Target latitude
 * @param {number} targetLng - Target longitude
 * @param {Array} points - Array of points with lat/lng
 * @returns {Object} Nearest point with distance
 */
const findNearest = (targetLat, targetLng, points) => {
  if (!points || points.length === 0) return null;

  const targetPoint = turf.point([targetLng, targetLat]);
  const featureCollection = turf.featureCollection(
    points.map(p => turf.point([p.longitude, p.latitude], p))
  );

  const nearest = turf.nearestPoint(targetPoint, featureCollection);
  
  return {
    ...nearest.properties,
    distance: calculateDistance(targetLat, targetLng, nearest.geometry.coordinates[1], nearest.geometry.coordinates[0])
  };
};

/**
 * Group points by distance ranges
 * Grouper les points par plages de distance
 * 
 * @param {Array} results - Array of results with distance
 * @param {Array} ranges - Array of distance ranges [10, 20, 30, 50]
 * @returns {Object} Grouped results by range
 */
const groupByDistanceRanges = (results, ranges = geocodingSettings.radiusOptions) => {
  const groups = {};
  
  // Initialize groups
  for (let i = 0; i < ranges.length; i++) {
    const rangeKey = i === 0 
      ? `0-${ranges[i]}km`
      : `${ranges[i-1]}-${ranges[i]}km`;
    groups[rangeKey] = [];
  }
  groups[`>${ranges[ranges.length - 1]}km`] = [];

  // Assign results to groups
  for (const result of results) {
    let assigned = false;
    for (let i = 0; i < ranges.length; i++) {
      const minRange = i === 0 ? 0 : ranges[i - 1];
      const maxRange = ranges[i];
      
      if (result.distance >= minRange && result.distance < maxRange) {
        const rangeKey = i === 0 
          ? `0-${ranges[i]}km`
          : `${ranges[i-1]}-${ranges[i]}km`;
        groups[rangeKey].push(result);
        assigned = true;
        break;
      }
    }
    
    if (!assigned) {
      groups[`>${ranges[ranges.length - 1]}km`].push(result);
    }
  }

  return groups;
};

/**
 * Calculate bearing between two points
 * Calculer le relèvement entre deux points
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Bearing in degrees (0-360)
 */
const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.bearing(from, to);
};

/**
 * Get cardinal direction from bearing
 * Obtenir la direction cardinale à partir du relèvement
 * 
 * @param {number} bearing - Bearing in degrees
 * @returns {Object} Cardinal direction with labels
 */
const getCardinalDirection = (bearing) => {
  const directions = [
    { min: -22.5, max: 22.5, en: 'North', fr: 'Nord', abbr: 'N' },
    { min: 22.5, max: 67.5, en: 'Northeast', fr: 'Nord-Est', abbr: 'NE' },
    { min: 67.5, max: 112.5, en: 'East', fr: 'Est', abbr: 'E' },
    { min: 112.5, max: 157.5, en: 'Southeast', fr: 'Sud-Est', abbr: 'SE' },
    { min: 157.5, max: 180, en: 'South', fr: 'Sud', abbr: 'S' },
    { min: -180, max: -157.5, en: 'South', fr: 'Sud', abbr: 'S' },
    { min: -157.5, max: -112.5, en: 'Southwest', fr: 'Sud-Ouest', abbr: 'SW' },
    { min: -112.5, max: -67.5, en: 'West', fr: 'Ouest', abbr: 'W' },
    { min: -67.5, max: -22.5, en: 'Northwest', fr: 'Nord-Ouest', abbr: 'NW' }
  ];

  for (const dir of directions) {
    if (bearing >= dir.min && bearing < dir.max) {
      return { labelEN: dir.en, labelFR: dir.fr, abbreviation: dir.abbr };
    }
  }

  return { labelEN: 'North', labelFR: 'Nord', abbreviation: 'N' };
};

/**
 * Perform proximity search
 * Effectuer une recherche de proximité
 * 
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radius - Search radius in kilometers
 * @param {Array} villages - Array of villages to search
 * @returns {Object} Proximity search results
 */
const proximitySearch = (centerLat, centerLng, radius, villages) => {
  const results = filterByRadius(villages, centerLat, centerLng, radius);
  
  // Add bearing and direction to each result
  const enrichedResults = results.map(result => {
    const bearing = calculateBearing(centerLat, centerLng, result.latitude, result.longitude);
    const direction = getCardinalDirection(bearing);
    
    return {
      ...result,
      bearing: Math.round(bearing),
      direction
    };
  });

  // Group by distance ranges
  const grouped = groupByDistanceRanges(enrichedResults);

  return {
    center: { latitude: centerLat, longitude: centerLng },
    radius,
    totalFound: enrichedResults.length,
    results: enrichedResults,
    grouped,
    boundingBox: getBoundingBox(centerLat, centerLng, radius)
  };
};

/**
 * Country border approximation data
 * Données d'approximation des frontières des pays
 * 
 * Contains approximate country boundaries for border proximity calculation.
 * Uses simplified bounding boxes and estimated border distances.
 */
const countryBorderData = {
  // North Africa
  'DZA': { center: { lat: 28.0339, lng: 1.6596 }, avgRadius: 800 },
  'EGY': { center: { lat: 26.8206, lng: 30.8025 }, avgRadius: 500 },
  'LBY': { center: { lat: 26.3351, lng: 17.2283 }, avgRadius: 700 },
  'MAR': { center: { lat: 31.7917, lng: -7.0926 }, avgRadius: 400 },
  'TUN': { center: { lat: 33.8869, lng: 9.5375 }, avgRadius: 200 },
  'SDN': { center: { lat: 12.8628, lng: 30.2176 }, avgRadius: 600 },
  // West Africa
  'BEN': { center: { lat: 9.3077, lng: 2.3158 }, avgRadius: 150 },
  'BFA': { center: { lat: 12.2383, lng: -1.5616 }, avgRadius: 250 },
  'CIV': { center: { lat: 7.5400, lng: -5.5471 }, avgRadius: 300 },
  'GHA': { center: { lat: 7.9465, lng: -1.0232 }, avgRadius: 250 },
  'GIN': { center: { lat: 9.9456, lng: -9.6966 }, avgRadius: 250 },
  'MLI': { center: { lat: 17.5707, lng: -3.9962 }, avgRadius: 500 },
  'NER': { center: { lat: 17.6078, lng: 8.0817 }, avgRadius: 500 },
  'NGA': { center: { lat: 9.0820, lng: 8.6753 }, avgRadius: 400 },
  'SEN': { center: { lat: 14.4974, lng: -14.4524 }, avgRadius: 250 },
  'TGO': { center: { lat: 8.6195, lng: 0.8248 }, avgRadius: 100 },
  // Central Africa
  'CMR': { center: { lat: 7.3697, lng: 12.3547 }, avgRadius: 350 },
  'CAF': { center: { lat: 6.6111, lng: 20.9394 }, avgRadius: 400 },
  'TCD': { center: { lat: 15.4542, lng: 18.7322 }, avgRadius: 500 },
  'COG': { center: { lat: -0.2280, lng: 15.8277 }, avgRadius: 300 },
  'COD': { center: { lat: -4.0383, lng: 21.7587 }, avgRadius: 600 },
  'GAB': { center: { lat: -0.8037, lng: 11.6094 }, avgRadius: 250 },
  // East Africa
  'ETH': { center: { lat: 9.1450, lng: 40.4897 }, avgRadius: 450 },
  'KEN': { center: { lat: -0.0236, lng: 37.9062 }, avgRadius: 350 },
  'TZA': { center: { lat: -6.3690, lng: 34.8888 }, avgRadius: 400 },
  'UGA': { center: { lat: 1.3733, lng: 32.2903 }, avgRadius: 250 },
  'RWA': { center: { lat: -1.9403, lng: 29.8739 }, avgRadius: 100 },
  'BDI': { center: { lat: -3.3731, lng: 29.9189 }, avgRadius: 80 },
  // Southern Africa
  'ZAF': { center: { lat: -30.5595, lng: 22.9375 }, avgRadius: 500 },
  'BWA': { center: { lat: -22.3285, lng: 24.6849 }, avgRadius: 350 },
  'NAM': { center: { lat: -22.9576, lng: 18.4904 }, avgRadius: 400 },
  'ZMB': { center: { lat: -13.1339, lng: 27.8493 }, avgRadius: 400 },
  'ZWE': { center: { lat: -19.0154, lng: 29.1549 }, avgRadius: 300 },
  'MOZ': { center: { lat: -18.6657, lng: 35.5296 }, avgRadius: 400 },
  'AGO': { center: { lat: -11.2027, lng: 17.8739 }, avgRadius: 450 },
  // Default for unknown countries
  'DEFAULT': { center: { lat: 0, lng: 20 }, avgRadius: 300 }
};

/**
 * Calculate distance to nearest international border
 * Calculer la distance à la frontière internationale la plus proche
 * 
 * Uses country center and average radius to estimate border distance.
 * This is an approximation - for precise calculations, use actual border geometry.
 * 
 * @param {number} lat - Latitude of the point
 * @param {number} lng - Longitude of the point
 * @param {string} countryCode - ISO 3166-1 alpha-3 country code
 * @returns {Object} Border proximity information
 */
const calculateBorderProximity = (lat, lng, countryCode) => {
  // Get country data or use default
  const countryData = countryBorderData[countryCode] || countryBorderData['DEFAULT'];
  
  // Calculate distance from point to country center
  const distanceToCenter = calculateDistance(
    lat, lng,
    countryData.center.lat, countryData.center.lng
  );
  
  // Estimate distance to border (avgRadius - distanceToCenter)
  // If point is outside the average radius, it's likely near or past the border
  let distanceToBorder = Math.max(0, countryData.avgRadius - distanceToCenter);
  
  // For points very close to center, estimate based on average radius
  if (distanceToCenter < countryData.avgRadius * 0.1) {
    distanceToBorder = countryData.avgRadius * 0.9;
  }
  
  // Round to 1 decimal place
  distanceToBorder = Math.round(distanceToBorder * 10) / 10;
  
  // Determine proximity level and indicator
  let level, indicator, labelEN, labelFR;
  
  if (distanceToBorder < 10) {
    level = 'very_close';
    indicator = 'danger';
    labelEN = 'Very Close';
    labelFR = 'Très proche';
  } else if (distanceToBorder < 25) {
    level = 'close';
    indicator = 'warning';
    labelEN = 'Close';
    labelFR = 'Proche';
  } else if (distanceToBorder < 50) {
    level = 'moderate';
    indicator = 'info';
    labelEN = 'Moderate';
    labelFR = 'Modérée';
  } else {
    level = 'far';
    indicator = 'safe';
    labelEN = 'Far';
    labelFR = 'Loin';
  }
  
  return {
    distance: distanceToBorder,
    distanceUnit: 'km',
    level,
    indicator,
    labelEN,
    labelFR,
    countryCode: countryCode || 'UNKNOWN'
  };
};

/**
 * Search within radius with optional query filtering
 * Rechercher dans un rayon avec filtrage optionnel par requête
 * 
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radius - Search radius in kilometers
 * @param {string} query - Optional search query to filter by name
 * @param {Array} data - Array of items with latitude/longitude properties
 * @returns {Array} Filtered and sorted results within radius
 */
const searchWithinRadius = (lat, lng, radius, query = '', data = []) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Filter by radius using existing filterByRadius function
  let filteredResults = filterByRadius(data, lat, lng, radius);

  // If query is provided, filter by name match
  if (query && query.trim().length > 0) {
    const searchQuery = query.toLowerCase().trim();
    filteredResults = filteredResults.filter(item => {
      const name = (item.name || item.villageName || item.displayName || '').toLowerCase();
      return name.includes(searchQuery);
    });
  }

  // Results are already sorted by distance from filterByRadius
  return filteredResults;
};

module.exports = {
  calculateDistance,
  isWithinRadius,
  filterByRadius,
  createBuffer,
  getBoundingBox,
  findNearest,
  groupByDistanceRanges,
  calculateBearing,
  getCardinalDirection,
  proximitySearch,
  calculateBorderProximity,
  searchWithinRadius
};
