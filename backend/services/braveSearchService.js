/**
 * Brave Search Service
 * Recherche web gratuite (2000 req/mois gratuit)
 * Remplace SerpAPI — inscription sur https://api.search.brave.com
 * Clé API à ajouter dans .env : BRAVE_SEARCH_API_KEY=votre_clé
 */

const axios = require('axios');

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search';
const TIMEOUT = 10000;

/**
 * Extract coordinates from text snippets using regex patterns
 */
const extractCoordsFromText = (text) => {
  if (!text) return null;

  // Patterns: "7.3456° N, 13.5678° E" or "lat: 7.34, lng: 13.56" or "7.3456, 13.5678"
  const patterns = [
    /(-?\d{1,3}\.\d{2,6})[°\s]*[Nn][,\s]+(-?\d{1,3}\.\d{2,6})[°\s]*[Ee]/,
    /lat(?:itude)?[:\s]+(-?\d{1,3}\.\d{2,6})[,\s]+lon(?:gitude)?[:\s]+(-?\d{1,3}\.\d{2,6})/i,
    /(\d{1,2}\.\d{4,6})[°\s]*N[,\s]+(\d{1,3}\.\d{4,6})[°\s]*E/,
    /coordinates?[:\s]+(-?\d{1,3}\.\d{3,6})[,\s]+(-?\d{1,3}\.\d{3,6})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      // Validate Africa bounding box roughly
      if (lat >= -35 && lat <= 37 && lng >= -20 && lng <= 55) {
        return { latitude: lat, longitude: lng };
      }
    }
  }
  return null;
};

/**
 * Search for a village using Brave Search API
 * @param {string} villageName
 * @param {string} country
 * @returns {Array} results with coordinates if found in snippets
 */
const searchVillage = async (villageName, country = '') => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.warn('[BraveSearch] BRAVE_SEARCH_API_KEY not configured');
    return [];
  }

  const query = `village ${villageName} ${country} coordinates latitude longitude Africa`;

  try {
    const resp = await axios.get(BRAVE_API, {
      params: { q: query, count: 5, search_lang: 'fr', country: 'ALL' },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      timeout: TIMEOUT,
    });

    const webResults = resp.data?.web?.results || [];
    const results = [];

    for (const item of webResults) {
      const textToSearch = `${item.title || ''} ${item.description || ''} ${item.extra_snippets?.join(' ') || ''}`;
      const coords = extractCoordsFromText(textToSearch);

      if (coords) {
        results.push({
          villageName: villageName,
          found: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
          source: 'Brave Web Search',
          label: item.title,
          description: item.description,
          url: item.url,
          confidence: 0.65, // Lower confidence since extracted from text
          reliability: 'low',
        });
      }
    }

    return results;
  } catch (err) {
    console.error('[BraveSearch] error:', err.message);
    return [];
  }
};

/**
 * Search for village info (Wikipedia, government sites, etc.)
 * Returns enriched text information even without coords
 */
const searchVillageInfo = async (villageName, country = '') => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const queries = [
    `"${villageName}" ${country} village coordonnées géographiques`,
    `${villageName} ${country} site:fr.wikipedia.org`,
    `${villageName} ${country} site:*.gouv.*`,
  ];

  const allResults = [];

  for (const query of queries) {
    try {
      const resp = await axios.get(BRAVE_API, {
        params: { q: query, count: 3 },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
        timeout: TIMEOUT,
      });

      const items = resp.data?.web?.results || [];
      allResults.push(...items.map(item => ({
        title: item.title,
        description: item.description,
        url: item.url,
        source: 'Web',
      })));
    } catch (e) {
      // Continue with next query
    }
  }

  return allResults.slice(0, 5);
};

module.exports = { searchVillage, searchVillageInfo, extractCoordsFromText };
