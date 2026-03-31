/**
 * Wikidata / Wikipedia Service
 * Recherche de villages via Wikidata et Wikipedia
 * Gratuit, pas de clé API requise
 */

const axios = require('axios');

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const TIMEOUT = 15000;

/**
 * Search a village on Wikidata by name
 * Returns coordinates + metadata
 */
const searchVillage = async (villageName, country = '') => {
  try {
    // Step 1: Search for entity
    const searchResp = await axios.get(WIKIDATA_API, {
      params: {
        action: 'wbsearchentities',
        search: country ? `${villageName} ${country}` : villageName,
        language: 'fr',
        uselang: 'fr',
        type: 'item',
        limit: 5,
        format: 'json',
        origin: '*',
      },
      timeout: TIMEOUT,
    });

    const entities = searchResp.data?.search || [];
    if (entities.length === 0) return [];

    // Step 2: Get coordinates for each entity
    const results = await Promise.allSettled(
      entities.slice(0, 3).map(entity => getEntityCoordinates(entity))
    );

    return results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
  } catch (err) {
    console.error('[Wikidata] searchVillage error:', err.message);
    return [];
  }
};

/**
 * Get coordinates for a Wikidata entity
 */
const getEntityCoordinates = async (entity) => {
  try {
    const resp = await axios.get(WIKIDATA_API, {
      params: {
        action: 'wbgetclaims',
        entity: entity.id,
        property: 'P625', // coordinate location
        format: 'json',
        origin: '*',
      },
      timeout: TIMEOUT,
    });

    const claims = resp.data?.claims?.P625 || [];
    if (claims.length === 0) return null;

    const coords = claims[0]?.mainsnak?.datavalue?.value;
    if (!coords?.latitude || !coords?.longitude) return null;

    return {
      villageName: entity.label || entity.match?.text,
      found: true,
      latitude: parseFloat(coords.latitude),
      longitude: parseFloat(coords.longitude),
      source: 'Wikidata',
      wikidataId: entity.id,
      description: entity.description || null,
      label: entity.label || null,
      confidence: 0.85,
      reliability: 'high',
      wikipediaUrl: `https://www.wikidata.org/wiki/${entity.id}`,
    };
  } catch (err) {
    return null;
  }
};

/**
 * SPARQL query — more powerful, finds villages in a country
 * @param {string} villageName
 * @param {string} countryName  e.g. "Cameroun"
 */
const sparqlSearchVillage = async (villageName, countryName = '') => {
  const countryFilter = countryName
    ? `?item wdt:P17 ?country . ?country rdfs:label "${countryName}"@fr .`
    : '';

  const sparql = `
    SELECT ?item ?itemLabel ?lat ?lng ?countryLabel WHERE {
      ?item wdt:P31/wdt:P279* wd:Q532 .  # village or subclass
      ?item wdt:P625 ?coords .
      ${countryFilter}
      ?item rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "fr" || LANG(?itemLabel) = "en")
      FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${villageName}")))
      BIND(geof:latitude(?coords) AS ?lat)
      BIND(geof:longitude(?coords) AS ?lng)
      OPTIONAL { ?item wdt:P17 ?country . ?country rdfs:label ?countryLabel FILTER(LANG(?countryLabel) = "fr") }
    }
    LIMIT 10
  `;

  try {
    const resp = await axios.get(WIKIDATA_SPARQL, {
      params: { query: sparql, format: 'json' },
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'VillagePointApp/1.0' },
      timeout: 20000,
    });

    const bindings = resp.data?.results?.bindings || [];
    return bindings.map(b => ({
      villageName: b.itemLabel?.value || villageName,
      found: true,
      latitude: parseFloat(b.lat?.value),
      longitude: parseFloat(b.lng?.value),
      source: 'Wikidata (SPARQL)',
      country: b.countryLabel?.value || null,
      wikidataId: b.item?.value?.split('/').pop(),
      confidence: 0.88,
      reliability: 'high',
      label: b.itemLabel?.value,
    })).filter(r => !isNaN(r.latitude) && !isNaN(r.longitude));
  } catch (err) {
    console.error('[Wikidata] sparqlSearch error:', err.message);
    return [];
  }
};

/**
 * Main export: tries standard search first, SPARQL as fallback
 */
const geocodeVillage = async (villageName, country = '') => {
  // Try standard search first (faster)
  const standard = await searchVillage(villageName, country);
  if (standard.length > 0) return standard;

  // Fallback: SPARQL (more precise but slower)
  return await sparqlSearchVillage(villageName, country);
};

module.exports = {
  geocodeVillage,
  searchVillage,
  sparqlSearchVillage,
  getEntityCoordinates,
};
