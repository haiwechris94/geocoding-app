/**
 * Overpass API Service (OpenStreetMap Advanced)
 * Recherche avancée de villages via OpenStreetMap
 * Gratuit, pas de clé API requise
 */

const axios = require('axios');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT = 25000;

/**
 * Search for a village by name within a radius
 * @param {string} villageName
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusKm
 * @returns {Array} results
 */
const searchVillageInRadius = async (villageName, centerLat, centerLng, radiusKm) => {
  const radiusMeters = radiusKm * 1000;

  // Overpass QL query — searches nodes, ways, relations tagged as places
  const query = `
    [out:json][timeout:20];
    (
      node["place"~"village|hamlet|town|city|suburb|locality"]["name"~"${escapeRegex(villageName)}",i]
        (around:${radiusMeters},${centerLat},${centerLng});
      way["place"~"village|hamlet|town"]["name"~"${escapeRegex(villageName)}",i]
        (around:${radiusMeters},${centerLat},${centerLng});
    );
    out center tags;
  `;

  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TIMEOUT,
    });

    const elements = response.data?.elements || [];
    return elements.map(el => formatElement(el, villageName)).filter(Boolean);
  } catch (err) {
    console.error('[Overpass] searchVillageInRadius error:', err.message);
    return [];
  }
};

/**
 * Search village globally (no radius) — useful as fallback
 */
const searchVillageGlobal = async (villageName, countryCode = null) => {
  const countryFilter = countryCode
    ? `["addr:country"="${countryCode.toUpperCase()}"]`
    : '';

  const query = `
    [out:json][timeout:20];
    (
      node["place"~"village|hamlet|town"]["name"~"^${escapeRegex(villageName)}$",i]${countryFilter};
      node["place"~"village|hamlet"]["name:fr"~"^${escapeRegex(villageName)}$",i];
      node["place"~"village|hamlet"]["name:en"~"^${escapeRegex(villageName)}$",i];
    );
    out center tags 10;
  `;

  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TIMEOUT,
    });

    const elements = response.data?.elements || [];
    return elements.map(el => formatElement(el, villageName)).filter(Boolean);
  } catch (err) {
    console.error('[Overpass] searchVillageGlobal error:', err.message);
    return [];
  }
};

/**
 * Search all villages within a bounding box — for area search
 */
const searchAreaVillages = async (villageName, centerLat, centerLng, radiusKm) => {
  const radiusMeters = radiusKm * 1000;

  const query = `
    [out:json][timeout:25];
    (
      node["place"~"village|hamlet|town|locality"]["name"~"${escapeRegex(villageName)}",i]
        (around:${radiusMeters},${centerLat},${centerLng});
    );
    out center tags;
  `;

  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TIMEOUT,
    });

    return (response.data?.elements || []).map(el => formatElement(el, villageName)).filter(Boolean);
  } catch (err) {
    console.error('[Overpass] searchAreaVillages error:', err.message);
    return [];
  }
};

/**
 * Format an Overpass element into a standard result object
 */
const formatElement = (el, query) => {
  const lat = el.lat || el.center?.lat;
  const lng = el.lon || el.center?.lon;
  if (!lat || !lng) return null;

  const tags = el.tags || {};
  const name = tags.name || tags['name:fr'] || tags['name:en'] || query;

  return {
    villageName: name,
    found: true,
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    source: 'Overpass (OpenStreetMap)',
    placeType: tags.place || 'unknown',
    country: tags['addr:country'] || tags['is_in:country'] || null,
    region: tags['is_in:state'] || tags['addr:state'] || null,
    population: tags.population ? parseInt(tags.population) : null,
    osmId: el.id,
    osmType: el.type,
    label: [name, tags['addr:city'], tags['is_in:country']].filter(Boolean).join(', '),
    confidence: 0.80,
    reliability: 'medium',
    rawTags: tags,
  };
};

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  searchVillageInRadius,
  searchVillageGlobal,
  searchAreaVillages,
};
