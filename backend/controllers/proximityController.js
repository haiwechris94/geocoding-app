/**
 * Proximity Controller
 * Contrôleur de Proximité
 * 
 * Handle radius-based search (10km, 20km, 30km, 50km).
 * Gérer la recherche basée sur le rayon (10km, 20km, 30km, 50km).
 */

const { proximitySearch, calculateDistance, getBoundingBox } = require('../services/proximityService');
const { geocodeSingleVillage } = require('../services/geocodingService');
const { validateCoordinates, validateRadius, validateVillageName, validateFilters } = require('../utils/validators');
const { getCountryByCode } = require('../config/countries');
const { geocodingSettings } = require('../config/apiConfig');

/**
 * Search villages within radius from coordinates
 * Rechercher des villages dans un rayon à partir de coordonnées
 */
const searchByRadius = async (req, res) => {
  try {
    const { latitude, longitude, radius, villages } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate coordinates
    const coordValidation = validateCoordinates(latitude, longitude);
    if (!coordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: coordValidation.error
      });
    }

    // Validate radius
    const radiusValidation = validateRadius(radius);
    if (!radiusValidation.valid) {
      return res.status(400).json({
        success: false,
        error: radiusValidation.error
      });
    }

    // Validate villages array
    if (!villages || !Array.isArray(villages) || villages.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Villages array is required',
          fr: 'Le tableau des villages est requis'
        }
      });
    }

    // Ensure all villages have coordinates
    const validVillages = villages.filter(v => 
      v.latitude !== undefined && 
      v.longitude !== undefined &&
      !isNaN(parseFloat(v.latitude)) &&
      !isNaN(parseFloat(v.longitude))
    ).map(v => ({
      ...v,
      latitude: parseFloat(v.latitude),
      longitude: parseFloat(v.longitude)
    }));

    if (validVillages.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'No villages with valid coordinates found',
          fr: 'Aucun village avec des coordonnées valides trouvé'
        }
      });
    }

    // Perform proximity search
    const results = proximitySearch(
      coordValidation.coordinates.latitude,
      coordValidation.coordinates.longitude,
      radiusValidation.value,
      validVillages
    );

    res.json({
      success: true,
      message: {
        en: `Found ${results.totalFound} villages within ${radiusValidation.value}km`,
        fr: `${results.totalFound} villages trouvés dans un rayon de ${radiusValidation.value}km`
      },
      data: results
    });
  } catch (error) {
    console.error('Proximity search error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error during proximity search',
        fr: 'Erreur lors de la recherche de proximité'
      }
    });
  }
};

/**
 * Search for a village and find nearby villages
 * Rechercher un village et trouver les villages à proximité
 */
const searchVillageWithProximity = async (req, res) => {
  try {
    const { villageName, radius, countryCode, region, knownVillages } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate village name
    const nameValidation = validateVillageName(villageName);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: nameValidation.error
      });
    }

    // Validate radius (default to 20km)
    const searchRadius = radius || geocodingSettings.defaultSearchRadius;
    const radiusValidation = validateRadius(searchRadius);
    if (!radiusValidation.valid) {
      return res.status(400).json({
        success: false,
        error: radiusValidation.error
      });
    }

    // Build filters
    const filters = { countryCode, region, language: lang };
    if (countryCode) {
      const country = getCountryByCode(countryCode);
      if (country) {
        filters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    // First, geocode the target village
    const targetResult = await geocodeSingleVillage(nameValidation.value, filters);

    if (!targetResult.found) {
      return res.status(404).json({
        success: false,
        error: {
          en: 'Target village not found',
          fr: 'Village cible non trouvé'
        },
        data: targetResult
      });
    }

    // If known villages provided, find nearby ones
    let nearbyVillages = [];
    if (knownVillages && Array.isArray(knownVillages) && knownVillages.length > 0) {
      const validVillages = knownVillages.filter(v => 
        v.latitude !== undefined && 
        v.longitude !== undefined
      ).map(v => ({
        ...v,
        latitude: parseFloat(v.latitude),
        longitude: parseFloat(v.longitude)
      }));

      if (validVillages.length > 0) {
        const proximityResults = proximitySearch(
          targetResult.latitude,
          targetResult.longitude,
          radiusValidation.value,
          validVillages
        );
        nearbyVillages = proximityResults.results;
      }
    }

    res.json({
      success: true,
      data: {
        targetVillage: targetResult,
        searchRadius: radiusValidation.value,
        boundingBox: getBoundingBox(targetResult.latitude, targetResult.longitude, radiusValidation.value),
        nearbyVillages,
        nearbyCount: nearbyVillages.length
      }
    });
  } catch (error) {
    console.error('Village proximity search error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error during village proximity search',
        fr: 'Erreur lors de la recherche de proximité du village'
      }
    });
  }
};

/**
 * Get available radius options
 * Obtenir les options de rayon disponibles
 */
const getRadiusOptions = (req, res) => {
  const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

  res.json({
    success: true,
    data: {
      options: geocodingSettings.radiusOptions.map(r => ({
        value: r,
        label: `${r} km`,
        labelFR: `${r} km`
      })),
      default: geocodingSettings.defaultSearchRadius,
      message: {
        en: 'Select a search radius',
        fr: 'Sélectionnez un rayon de recherche'
      }
    }
  });
};

/**
 * Calculate distance between two points
 * Calculer la distance entre deux points
 */
const getDistance = (req, res) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.query;

    // Validate first point
    const coord1Validation = validateCoordinates(lat1, lng1);
    if (!coord1Validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Invalid first point coordinates',
          fr: 'Coordonnées du premier point invalides'
        }
      });
    }

    // Validate second point
    const coord2Validation = validateCoordinates(lat2, lng2);
    if (!coord2Validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Invalid second point coordinates',
          fr: 'Coordonnées du second point invalides'
        }
      });
    }

    const distance = calculateDistance(
      coord1Validation.coordinates.latitude,
      coord1Validation.coordinates.longitude,
      coord2Validation.coordinates.latitude,
      coord2Validation.coordinates.longitude
    );

    res.json({
      success: true,
      data: {
        point1: coord1Validation.coordinates,
        point2: coord2Validation.coordinates,
        distance: Math.round(distance * 100) / 100,
        unit: 'km'
      }
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error calculating distance',
        fr: 'Erreur lors du calcul de la distance'
      }
    });
  }
};

module.exports = {
  searchByRadius,
  searchVillageWithProximity,
  getRadiusOptions,
  getDistance
};
