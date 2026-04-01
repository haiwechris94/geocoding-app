/**
 * Filter Controller — with GeoNames fallback for all African countries
 * Contrôleur de Filtres — avec fallback GeoNames pour tous les pays africains
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

// ── In-memory cache to avoid repeated GeoNames calls ──────────────────────
const geoNamesCache = {};

// ── GeoNames admin levels ──────────────────────────────────────────────────
const GEONAMES_USER = process.env.GEONAMES_USERNAME || 'demo';

/**
 * Fetch admin divisions from GeoNames API
 * @param {string} countryCode  ISO2 country code
 * @param {number} adminLevel   1 = regions, 2 = departments, 3 = arrondissements
 * @param {string} parentAdminCode  required for level 2 and 3
 */
const fetchGeoNamesAdmin = async (countryCode, adminLevel, parentAdminCode = null) => {
  const cacheKey = `${countryCode}_${adminLevel}_${parentAdminCode || 'root'}`;
  if (geoNamesCache[cacheKey]) return geoNamesCache[cacheKey];

  try {
    let url, params;

    if (adminLevel === 1) {
      // Get all admin1 (regions) for a country
      url = 'http://api.geonames.org/searchJSON';
      params = {
        country: countryCode,
        featureCode: 'ADM1',
        maxRows: 100,
        username: GEONAMES_USER,
        style: 'SHORT',
      };
    } else if (adminLevel === 2) {
      // Get admin2 (departments) under a given admin1
      url = 'http://api.geonames.org/searchJSON';
      params = {
        country: countryCode,
        adminCode1: parentAdminCode,
        featureCode: 'ADM2',
        maxRows: 200,
        username: GEONAMES_USER,
        style: 'SHORT',
      };
    } else if (adminLevel === 3) {
      // Get admin3 (arrondissements) under a given admin2
      // adminCode2 format: "CM.CE.MFOUNDI" → split to get admin1+admin2
      const parts = (parentAdminCode || '').split('.');
      url = 'http://api.geonames.org/searchJSON';
      params = {
        country: countryCode,
        adminCode1: parts[0] || parentAdminCode,
        adminCode2: parts[1] || parentAdminCode,
        featureCode: 'ADM3',
        maxRows: 300,
        username: GEONAMES_USER,
        style: 'SHORT',
      };
    }

    const resp = await axios.get(url, { params, timeout: 8000 });
    const items = (resp.data?.geonames || []).map(g => ({
      id: `${countryCode}_${adminLevel}_${g.adminCode1 || ''}_${g.adminCode2 || ''}_${g.adminCode3 || ''}_${g.geonameId}`,
      geonameId: g.geonameId,
      name: g.name,
      adminCode1: g.adminCode1,
      adminCode2: g.adminCode2,
      adminCode3: g.adminCode3,
      lat: g.lat,
      lng: g.lng,
    }));

    geoNamesCache[cacheKey] = items;
    return items;
  } catch (err) {
    console.warn(`[GeoNames] admin${adminLevel} fetch failed for ${countryCode}:`, err.message);
    return [];
  }
};

// ── Get all African countries ──────────────────────────────────────────────
const getAllCountries = (req, res) => {
  try {
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';
    const countries = getCountries(lang);
    res.json({ success: true, data: { countries, total: countries.length } });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching countries', fr: 'Erreur pays' } });
  }
};

// ── Get regions for a country ──────────────────────────────────────────────
const getCountryRegions = async (req, res) => {
  try {
    const { countryCode } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    const validation = validateCountryCode(countryCode);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    // 1. Try local static data first
    let regions = getRegions(validation.value, lang);

    // 2. Fallback to GeoNames if empty
    if (!regions || regions.length === 0) {
      console.log(`[FilterController] No local regions for ${validation.value} — fetching from GeoNames`);
      const geoItems = await fetchGeoNamesAdmin(validation.value, 1);
      regions = geoItems.map(g => ({
        id: `${validation.value}_${g.adminCode1}`,
        name: g.name,
        adminCode: g.adminCode1,
        geonameId: g.geonameId,
        countryCode: validation.value,
      }));
    }

    res.json({ success: true, data: { countryCode: validation.value, regions, total: regions.length } });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching regions', fr: 'Erreur régions' } });
  }
};

// ── Get departments for a region ───────────────────────────────────────────
const getRegionDepartments = async (req, res) => {
  try {
    const { regionId } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!regionId) {
      return res.status(400).json({ success: false, error: { en: 'Region ID required', fr: 'ID région requis' } });
    }

    // 1. Try local static data first
    let departments = getDepartments(regionId, lang);

    // 2. Fallback to GeoNames
    if (!departments || departments.length === 0) {
      // regionId format: "CM_CE" or "CM_CE_ADMIN1CODE"
      const parts = regionId.split('_');
      const countryCode = parts[0];
      const adminCode1 = parts[1];

      if (countryCode && adminCode1) {
        console.log(`[FilterController] No local departments for ${regionId} — fetching from GeoNames`);
        const geoItems = await fetchGeoNamesAdmin(countryCode, 2, adminCode1);
        departments = geoItems.map(g => ({
          id: `${countryCode}_${adminCode1}_${g.adminCode2}`,
          name: g.name,
          adminCode1: g.adminCode1,
          adminCode2: g.adminCode2,
          geonameId: g.geonameId,
          regionId,
        }));
      }
    }

    res.json({ success: true, data: { regionId, departments, total: departments.length } });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching departments', fr: 'Erreur départements' } });
  }
};

// ── Get arrondissements for a department ───────────────────────────────────
const getDepartmentArrondissements = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!departmentId) {
      return res.status(400).json({ success: false, error: { en: 'Department ID required', fr: 'ID département requis' } });
    }

    // 1. Try local static data first
    let arrondissements = getArrondissements(departmentId, lang);

    // 2. Fallback to GeoNames
    if (!arrondissements || arrondissements.length === 0) {
      // departmentId format: "CM_CE_MFOUNDI"
      const parts = departmentId.split('_');
      const countryCode = parts[0];
      const adminCode1 = parts[1];
      const adminCode2 = parts[2];

      if (countryCode && adminCode1 && adminCode2) {
        console.log(`[FilterController] No local arrondissements for ${departmentId} — fetching from GeoNames`);
        const parentCode = `${adminCode1}.${adminCode2}`;
        const geoItems = await fetchGeoNamesAdmin(countryCode, 3, parentCode);
        arrondissements = geoItems.map(g => ({
          id: `${countryCode}_${adminCode1}_${adminCode2}_${g.adminCode3 || g.geonameId}`,
          name: g.name,
          adminCode1: g.adminCode1,
          adminCode2: g.adminCode2,
          adminCode3: g.adminCode3,
          geonameId: g.geonameId,
          departmentId,
        }));
      }
    }

    res.json({ success: true, data: { departmentId, arrondissements, total: arrondissements.length } });
  } catch (error) {
    console.error('Get arrondissements error:', error);
    res.status(500).json({ success: false, error: { en: 'Error fetching arrondissements', fr: 'Erreur arrondissements' } });
  }
};

// ── Search administrative divisions ───────────────────────────────────────
const searchDivisions = (req, res) => {
  try {
    const { query, countryCode } = req.query;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: { en: 'Query must be at least 2 characters', fr: 'Requête trop courte' }
      });
    }

    const results = searchAdministrativeDivisions(query, countryCode, lang);
    res.json({ success: true, data: { query, results } });
  } catch (error) {
    console.error('Search divisions error:', error);
    res.status(500).json({ success: false, error: { en: 'Error searching', fr: 'Erreur recherche' } });
  }
};

module.exports = {
  getAllCountries,
  getCountryRegions,
  getRegionDepartments,
  getDepartmentArrondissements,
  searchDivisions
};
