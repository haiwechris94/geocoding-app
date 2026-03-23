/**
 * Filter Controller
 * Contrôleur de Filtres
 * 
 * Return geographic filter options.
 * Retourner les options de filtres géographiques.
 */

const { 
  getCountries, 
  getRegions, 
  getDepartments, 
  getArrondissements,
  getContinentalRegions,
  getCountriesByContinentalRegion,
  searchAdministrativeDivisions
} = require('../services/filterService');
const { validateCountryCode } = require('../utils/validators');

/**
 * Get all African countries
 * Obtenir tous les pays africains
 */
const getAllCountries = (req, res) => {
  try {
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';
    const countries = getCountries(lang);

    res.json({
      success: true,
      data: {
        countries,
        total: countries.length
      }
    });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error fetching countries',
        fr: 'Erreur lors de la récupération des pays'
      }
    });
  }
};

/**
 * Get regions for a country
 * Obtenir les régions d'un pays
 */
const getCountryRegions = (req, res) => {
  try {
    const { countryCode } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    const validation = validateCountryCode(countryCode);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const regions = getRegions(validation.value, lang);

    res.json({
      success: true,
      data: {
        countryCode: validation.value,
        regions,
        total: regions.length
      }
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error fetching regions',
        fr: 'Erreur lors de la récupération des régions'
      }
    });
  }
};

/**
 * Get departments for a region
 * Obtenir les départements d'une région
 */
const getRegionDepartments = (req, res) => {
  try {
    const { regionId } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!regionId) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Region ID is required',
          fr: 'L\'ID de la région est requis'
        }
      });
    }

    const departments = getDepartments(regionId, lang);

    res.json({
      success: true,
      data: {
        regionId,
        departments,
        total: departments.length
      }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error fetching departments',
        fr: 'Erreur lors de la récupération des départements'
      }
    });
  }
};

/**
 * Get arrondissements for a department
 * Obtenir les arrondissements d'un département
 */
const getDepartmentArrondissements = (req, res) => {
  try {
    const { departmentId } = req.params;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Department ID is required',
          fr: 'L\'ID du département est requis'
        }
      });
    }

    const arrondissements = getArrondissements(departmentId, lang);

    res.json({
      success: true,
      data: {
        departmentId,
        arrondissements,
        total: arrondissements.length
      }
    });
  } catch (error) {
    console.error('Get arrondissements error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error fetching arrondissements',
        fr: 'Erreur lors de la récupération des arrondissements'
      }
    });
  }
};

/**
 * Search administrative divisions
 * Rechercher des divisions administratives
 */
const searchDivisions = (req, res) => {
  try {
    const { query, countryCode } = req.query;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Search query must be at least 2 characters',
          fr: 'La requête doit contenir au moins 2 caractères'
        }
      });
    }

    const results = searchAdministrativeDivisions(query, countryCode, lang);

    res.json({
      success: true,
      data: {
        query,
        results
      }
    });
  } catch (error) {
    console.error('Search divisions error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error searching divisions',
        fr: 'Erreur lors de la recherche'
      }
    });
  }
};

module.exports = {
  getAllCountries,
  getCountryRegions,
  getRegionDepartments,
  getDepartmentArrondissements,
  searchDivisions
};
