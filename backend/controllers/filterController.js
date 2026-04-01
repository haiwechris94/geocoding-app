/**
 * Filter Controller — Nominatim fallback for all African countries
 * Pas de clé API requise pour le fallback
 */

const axios = require('axios');
const {
  getCountries,
  getRegions,
  getDepartments,
  getArrondissements,
  searchAdministrativeDivisions
} = require('../services/filterService');
const { validateCountryCode } = require('../utils/validators');

// ── In-memory cache ────────────────────────────────────────────────────────
const cache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

const getCache = (key) => {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { delete cache[key]; return null; }
  return entry.data;
};
const setCache = (key, data) => { cache[key] = { data, ts: Date.now() }; };

// ── Nominatim admin level fetcher ──────────────────────────────────────────
// adminLevel: 4=region, 5=department, 6=arrondissement (varies by country)
const fetchNominatimAdmin = async (countryCode, adminLevel, parentName = null) => {
  const cacheKey = `nominatim_${countryCode}_${adminLevel}_${parentName || 'root'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // Build query: search for admin boundaries at the given level within the country
    let q = parentName
      ? `${parentName}, ${countryCode}`
      : countryCode;

    const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q,
        format: 'json',
        addressdetails: 1,
        limit: 50,
        featuretype: 'state', // works for admin boundaries
        countrycodes: countryCode.toLowerCase(),
        'accept-language': 'fr,en',
      },
      headers: { 'User-Agent': 'VillagePointApp/1.0 geocoding@villagepoint.app' },
      timeout: 10000,
    });

    const results = resp.data || [];
    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn(`[Nominatim] admin fetch failed (${countryCode} level ${adminLevel}):`, err.message);
    return [];
  }
};

// ── GeoNames fallback (if username configured) ─────────────────────────────
const fetchGeoNamesAdmin = async (countryCode, featureCode, adminCode1 = null, adminCode2 = null) => {
  const username = process.env.GEONAMES_USERNAME;
  if (!username || username === 'demo') return [];

  const cacheKey = `geonames_${countryCode}_${featureCode}_${adminCode1}_${adminCode2}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const params = {
      country: countryCode,
      featureCode,
      maxRows: 200,
      username,
      style: 'SHORT',
    };
    if (adminCode1) params.adminCode1 = adminCode1;
    if (adminCode2) params.adminCode2 = adminCode2;

    const resp = await axios.get('http://api.geonames.org/searchJSON', { params, timeout: 10000 });
    const items = resp.data?.geonames || [];
    setCache(cacheKey, items);
    return items;
  } catch (err) {
    console.warn(`[GeoNames] ${featureCode} fetch failed for ${countryCode}:`, err.message);
    return [];
  }
};

// ── Overpass API for admin boundaries (most reliable, no key needed) ───────
const fetchOverpassAdmin = async (countryCode, adminLevel, parentRelationId = null) => {
  const cacheKey = `overpass_${countryCode}_adm${adminLevel}_${parentRelationId || 'root'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    let query;
    if (parentRelationId) {
      // Children of a specific relation
      query = `
        [out:json][timeout:25];
        relation(${parentRelationId});
        map_to_area->.parent;
        relation["boundary"="administrative"]["admin_level"="${adminLevel}"](area.parent);
        out tags;
      `;
    } else {
      // Top-level admin for a country code
      query = `
        [out:json][timeout:25];
        area["ISO3166-1"="${countryCode.toUpperCase()}"]->.country;
        relation["boundary"="administrative"]["admin_level"="${adminLevel}"](area.country);
        out tags;
      `;
    }

    const resp = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000,
      }
    );

    const elements = resp.data?.elements || [];
    setCache(cacheKey, elements);
    return elements;
  } catch (err) {
    console.warn(`[Overpass] admin${adminLevel} fetch failed for ${countryCode}:`, err.message);
    return [];
  }
};

// ── Format Overpass element to standard item ───────────────────────────────
const formatOverpassItem = (el, parentId = null) => {
  const tags = el.tags || {};
  const name = tags['name:fr'] || tags.name || tags['name:en'] || '';
  if (!name) return null;
  return {
    id: `osm_${el.id}`,
    osmId: el.id,
    name,
    nameEn: tags['name:en'] || name,
    nameFr: tags['name:fr'] || name,
    adminLevel: tags.admin_level,
    isoCode: tags['ISO3166-2'] || tags['ref'] || null,
    parentId,
  };
};

// ── getAllCountries ─────────────────────────────────────────────────────────
const getAllCountries = (req, res) => {
  try {
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';
    const countries = getCountries(lang);
    res.json({ success: true, data: { countries, total: countries.length } });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ success: false, error: { en: 'Error', fr: 'Erreur' } });
  }
};

// ── getCountryRegions ───────────────────────────────────────────────────────
const getCountryRegions = async (req, res) => {
  try {
    const { countryCode } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    const validation = validateCountryCode(countryCode);
    if (!validation.valid) return res.status(400).json({ success: false, error: validation.error });
    const cc = validation.value;

    // 1. Local static data
    let regions = getRegions(cc, lang) || [];

    // 2. GeoNames fallback
    if (regions.length === 0) {
      console.log(`[Filter] Fetching regions for ${cc} from GeoNames...`);
      const geoItems = await fetchGeoNamesAdmin(cc, 'ADM1');
      if (geoItems.length > 0) {
        regions = geoItems.map(g => ({
          id: `${cc}_${g.adminCode1}`,
          name: g.name,
          adminCode: g.adminCode1,
          source: 'geonames',
        }));
      }
    }

    // 3. Overpass fallback (no key needed, most reliable)
    if (regions.length === 0) {
      console.log(`[Filter] Fetching regions for ${cc} from Overpass...`);
      // Admin level 4 = regions in most African countries, 3 for some
      const [adm4, adm3] = await Promise.all([
        fetchOverpassAdmin(cc, 4),
        fetchOverpassAdmin(cc, 3),
      ]);
      const elements = adm4.length > 0 ? adm4 : adm3;
      regions = elements
        .map(el => formatOverpassItem(el))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({ success: true, data: { countryCode: cc, regions, total: regions.length } });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching regions', fr: 'Erreur régions' } });
  }
};

// ── getRegionDepartments ────────────────────────────────────────────────────
const getRegionDepartments = async (req, res) => {
  try {
    const { regionId } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!regionId) return res.status(400).json({ success: false, error: { en: 'Region ID required', fr: 'ID région requis' } });

    // 1. Local static data
    let departments = getDepartments(regionId, lang) || [];

    // 2. Parse regionId to extract info
    const isOsm = regionId.startsWith('osm_');
    const osmId = isOsm ? regionId.replace('osm_', '') : null;
    const parts = regionId.split('_');
    const countryCode = parts[0];
    const adminCode1 = parts[1];

    // 3. GeoNames fallback
    if (departments.length === 0 && !isOsm && countryCode && adminCode1) {
      console.log(`[Filter] Fetching departments for ${regionId} from GeoNames...`);
      const geoItems = await fetchGeoNamesAdmin(countryCode, 'ADM2', adminCode1);
      if (geoItems.length > 0) {
        departments = geoItems.map(g => ({
          id: `${countryCode}_${adminCode1}_${g.adminCode2}`,
          name: g.name,
          adminCode1: g.adminCode1,
          adminCode2: g.adminCode2,
          source: 'geonames',
        }));
      }
    }

    // 4. Overpass fallback
    if (departments.length === 0) {
      const osmRelId = osmId || null;
      if (osmRelId) {
        console.log(`[Filter] Fetching departments for OSM relation ${osmRelId} from Overpass...`);
        const elements = await fetchOverpassAdmin(null, 5, osmRelId);
        departments = elements.map(el => formatOverpassItem(el, regionId)).filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    res.json({ success: true, data: { regionId, departments, total: departments.length } });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching departments', fr: 'Erreur départements' } });
  }
};

// ── getDepartmentArrondissements ────────────────────────────────────────────
const getDepartmentArrondissements = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!departmentId) return res.status(400).json({ success: false, error: { en: 'Department ID required', fr: 'ID département requis' } });

    // 1. Local static data
    let arrondissements = getArrondissements(departmentId, lang) || [];

    // 2. Parse IDs
    const isOsm = departmentId.startsWith('osm_');
    const osmId = isOsm ? departmentId.replace('osm_', '') : null;
    const parts = departmentId.split('_');
    const countryCode = parts[0];
    const adminCode1 = parts[1];
    const adminCode2 = parts[2];

    // 3. GeoNames fallback
    if (arrondissements.length === 0 && !isOsm && countryCode && adminCode1 && adminCode2) {
      console.log(`[Filter] Fetching arrondissements for ${departmentId} from GeoNames...`);
      const geoItems = await fetchGeoNamesAdmin(countryCode, 'ADM3', adminCode1, adminCode2);
      if (geoItems.length > 0) {
        arrondissements = geoItems.map(g => ({
          id: `${countryCode}_${adminCode1}_${adminCode2}_${g.adminCode3 || g.geonameId}`,
          name: g.name,
          adminCode3: g.adminCode3,
          source: 'geonames',
        }));
      }
    }

    // 4. Overpass fallback
    if (arrondissements.length === 0) {
      const osmRelId = osmId || null;
      if (osmRelId) {
        console.log(`[Filter] Fetching arrondissements for OSM relation ${osmRelId} from Overpass...`);
        const elements = await fetchOverpassAdmin(null, 6, osmRelId);
        arrondissements = elements.map(el => formatOverpassItem(el, departmentId)).filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    res.json({ success: true, data: { departmentId, arrondissements, total: arrondissements.length } });
  } catch (error) {
    console.error('Get arrondissements error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching arrondissements', fr: 'Erreur arrondissements' } });
  }
};

// ── searchDivisions ─────────────────────────────────────────────────────────
const searchDivisions = (req, res) => {
  try {
    const { query, countryCode } = req.query;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, error: { en: 'Query too short', fr: 'Requête trop courte' } });
    }
    const results = searchAdministrativeDivisions(query, countryCode, lang);
    res.json({ success: true, data: { query, results } });
  } catch (error) {
    console.error('Search divisions error:', error);
    res.status(500).json({ success: false, error: { en: 'Error', fr: 'Erreur' } });
  }
};

module.exports = {
  getAllCountries,
  getCountryRegions,
  getRegionDepartments,
  getDepartmentArrondissements,
  searchDivisions
};
