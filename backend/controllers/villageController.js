/**
 * Village Controller
 * Contrôleur de Villages
 * 
 * Handle single village search with filters.
 * Gérer la recherche de village unique avec des filtres.
 */

const { geocodeSingleVillage } = require('../services/geocodingService');
const { validateVillageName, validateFilters, sanitizeString } = require('../utils/validators');
const { getCountryByCode } = require('../config/countries');

/**
 * Search for a single village
 * Rechercher un seul village
 */
const searchVillage = async (req, res) => {
  try {
    const { name, countryCode, region, department, arrondissement } = req.query;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate village name
    const nameValidation = validateVillageName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: nameValidation.error
      });
    }

    // Build filters
    const filters = {
      countryCode,
      region,
      department,
      arrondissement,
      language: lang
    };

    // Validate filters
    const filterValidation = validateFilters(filters);
    if (!filterValidation.valid) {
      return res.status(400).json({
        success: false,
        error: filterValidation.errors
      });
    }

    // Enrich filters with country name
    const enrichedFilters = { ...filterValidation.filters };
    if (enrichedFilters.countryCode) {
      const country = getCountryByCode(enrichedFilters.countryCode);
      if (country) {
        enrichedFilters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    // Perform search
    const result = await geocodeSingleVillage(nameValidation.value, enrichedFilters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Village search error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error searching for village',
        fr: 'Erreur lors de la recherche du village'
      }
    });
  }
};

/**
 * Get village suggestions (autocomplete)
 * Obtenir des suggestions de villages (autocomplétion)
 */
const getVillageSuggestions = async (req, res) => {
  try {
    const { query, countryCode, limit = 5 } = req.query;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Query must be at least 2 characters',
          fr: 'La requête doit contenir au moins 2 caractères'
        }
      });
    }

    const sanitized = sanitizeString(query);
    
    // Build filters
    const filters = {
      countryCode,
      language: lang
    };

    if (countryCode) {
      const country = getCountryByCode(countryCode);
      if (country) {
        filters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    // Get geocoding result (which includes alternatives)
    const result = await geocodeSingleVillage(sanitized, filters);

    // Build suggestions from result and alternatives
    const suggestions = [];
    
    if (result.found) {
      suggestions.push({
        name: result.villageName,
        formattedAddress: result.formattedAddress,
        latitude: result.latitude,
        longitude: result.longitude,
        confidence: result.confidence
      });
    }

    if (result.alternativeResults) {
      result.alternativeResults.forEach(alt => {
        suggestions.push({
          name: alt.formattedAddress?.split(',')[0] || result.villageName,
          formattedAddress: alt.formattedAddress,
          latitude: alt.latitude,
          longitude: alt.longitude,
          confidence: alt.confidence
        });
      });
    }

    res.json({
      success: true,
      data: {
        query: sanitized,
        suggestions: suggestions.slice(0, parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error getting suggestions',
        fr: 'Erreur lors de l\'obtention des suggestions'
      }
    });
  }
};

/**
 * Validate village coordinates
 * Valider les coordonnées d'un village
 */
const validateVillageCoordinates = async (req, res) => {
  try {
    const { villageName, latitude, longitude, countryCode } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate inputs
    if (!villageName || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Village name, latitude, and longitude are required',
          fr: 'Le nom du village, la latitude et la longitude sont requis'
        }
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Invalid coordinates',
          fr: 'Coordonnées invalides'
        }
      });
    }

    // Get geocoding result for comparison
    const filters = { countryCode, language: lang };
    if (countryCode) {
      const country = getCountryByCode(countryCode);
      if (country) {
        filters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    const result = await geocodeSingleVillage(villageName, filters);

    // Calculate distance between provided and geocoded coordinates
    let distanceFromGeocoded = null;
    let validationStatus = 'unknown';

    if (result.found) {
      const turf = require('@turf/turf');
      const from = turf.point([lng, lat]);
      const to = turf.point([result.longitude, result.latitude]);
      distanceFromGeocoded = turf.distance(from, to, { units: 'kilometers' });

      if (distanceFromGeocoded < 1) {
        validationStatus = 'exact';
      } else if (distanceFromGeocoded < 5) {
        validationStatus = 'close';
      } else if (distanceFromGeocoded < 20) {
        validationStatus = 'nearby';
      } else {
        validationStatus = 'far';
      }
    }

    res.json({
      success: true,
      data: {
        villageName,
        providedCoordinates: { latitude: lat, longitude: lng },
        geocodedCoordinates: result.found ? {
          latitude: result.latitude,
          longitude: result.longitude
        } : null,
        distanceFromGeocoded: distanceFromGeocoded ? Math.round(distanceFromGeocoded * 100) / 100 : null,
        validationStatus,
        validationMessage: {
          exact: { en: 'Coordinates match exactly', fr: 'Les coordonnées correspondent exactement' },
          close: { en: 'Coordinates are very close', fr: 'Les coordonnées sont très proches' },
          nearby: { en: 'Coordinates are in the vicinity', fr: 'Les coordonnées sont dans les environs' },
          far: { en: 'Coordinates are far from expected location', fr: 'Les coordonnées sont éloignées de l\'emplacement attendu' },
          unknown: { en: 'Could not validate coordinates', fr: 'Impossible de valider les coordonnées' }
        }[validationStatus]
      }
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error validating coordinates',
        fr: 'Erreur lors de la validation des coordonnées'
      }
    });
  }
};

module.exports = {
  searchVillage,
  getVillageSuggestions,
  validateVillageCoordinates
};
