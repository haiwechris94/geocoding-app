/**
 * Search History Model
 * Modèle d'Historique de Recherche
 * 
 * Schema and structure for storing search history.
 * Schéma et structure pour stocker l'historique de recherche.
 */

/**
 * Search History Entry Schema
 * Schéma d'une entrée d'historique de recherche
 * 
 * @typedef {Object} SearchHistoryEntry
 * @property {string} id - Unique identifier (UUID)
 * @property {string} timestamp - ISO timestamp of the search
 * @property {string} query - The search query (village name)
 * @property {string} type - Type of search: 'single', 'batch', 'area'
 * @property {Object} filters - Geographic filters applied
 * @property {string} [filters.countryCode] - Country code
 * @property {string} [filters.country] - Country name
 * @property {string} [filters.region] - Region name
 * @property {string} [filters.department] - Department name
 * @property {string} [filters.arrondissement] - Arrondissement name
 * @property {number} [filters.radius] - Search radius in km
 * @property {Object} [filters.center] - Center coordinates for area search
 * @property {Object} result - Search result
 * @property {boolean} result.found - Whether location was found
 * @property {number} [result.confidence] - Confidence score (0-1)
 * @property {number} [result.latitude] - Latitude of found location
 * @property {number} [result.longitude] - Longitude of found location
 * @property {string} [result.source] - Data source (nominatim, google, etc.)
 * @property {string} [result.formattedAddress] - Formatted address
 * @property {Object} metadata - Additional metadata
 * @property {number} [metadata.responseTime] - Response time in ms
 * @property {number} [metadata.alternativesCount] - Number of alternatives found
 * @property {string} [metadata.userAgent] - User agent string
 */

/**
 * Search Statistics Schema
 * Schéma des statistiques de recherche
 * 
 * @typedef {Object} SearchStatistics
 * @property {number} totalSearches - Total number of searches
 * @property {number} successRate - Success rate percentage
 * @property {number} averageConfidence - Average confidence percentage
 * @property {Array<Object>} mostSearchedLocations - Most searched locations
 * @property {Object} searchesByType - Searches grouped by type
 * @property {Object} searchesByCountry - Searches grouped by country
 * @property {Array<Object>} searchesByDay - Daily search counts
 * @property {Object} recentTrends - Recent trend analysis
 */

/**
 * Validate a search history entry
 * Valider une entrée d'historique de recherche
 * 
 * @param {Object} entry - Entry to validate
 * @returns {Object} Validation result
 */
const validateEntry = (entry) => {
  const errors = [];
  
  if (!entry.query || typeof entry.query !== 'string') {
    errors.push({
      field: 'query',
      message: { en: 'Query is required', fr: 'La requête est requise' }
    });
  }
  
  if (!entry.type || !['single', 'batch', 'area'].includes(entry.type)) {
    errors.push({
      field: 'type',
      message: { en: 'Invalid search type', fr: 'Type de recherche invalide' }
    });
  }
  
  if (entry.result) {
    if (typeof entry.result.found !== 'boolean') {
      errors.push({
        field: 'result.found',
        message: { en: 'Found status is required', fr: 'Le statut trouvé est requis' }
      });
    }
    
    if (entry.result.found) {
      if (entry.result.latitude !== undefined && 
          (typeof entry.result.latitude !== 'number' || 
           entry.result.latitude < -90 || 
           entry.result.latitude > 90)) {
        errors.push({
          field: 'result.latitude',
          message: { en: 'Invalid latitude', fr: 'Latitude invalide' }
        });
      }
      
      if (entry.result.longitude !== undefined && 
          (typeof entry.result.longitude !== 'number' || 
           entry.result.longitude < -180 || 
           entry.result.longitude > 180)) {
        errors.push({
          field: 'result.longitude',
          message: { en: 'Invalid longitude', fr: 'Longitude invalide' }
        });
      }
      
      if (entry.result.confidence !== undefined && 
          (typeof entry.result.confidence !== 'number' || 
           entry.result.confidence < 0 || 
           entry.result.confidence > 1)) {
        errors.push({
          field: 'result.confidence',
          message: { en: 'Confidence must be between 0 and 1', fr: 'La confiance doit être entre 0 et 1' }
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Create a new search history entry
 * Créer une nouvelle entrée d'historique de recherche
 * 
 * @param {Object} data - Entry data
 * @returns {Object} New entry
 */
const createEntry = (data) => {
  const { v4: uuidv4 } = require('uuid');
  
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    query: data.query || '',
    type: data.type || 'single',
    filters: {
      countryCode: data.filters?.countryCode || null,
      country: data.filters?.country || null,
      region: data.filters?.region || null,
      department: data.filters?.department || null,
      arrondissement: data.filters?.arrondissement || null,
      radius: data.filters?.radius || null,
      center: data.filters?.center || null
    },
    result: {
      found: data.result?.found || false,
      confidence: data.result?.confidence || 0,
      latitude: data.result?.latitude || null,
      longitude: data.result?.longitude || null,
      source: data.result?.source || null,
      formattedAddress: data.result?.formattedAddress || null
    },
    metadata: {
      responseTime: data.metadata?.responseTime || null,
      alternativesCount: data.metadata?.alternativesCount || 0,
      userAgent: data.metadata?.userAgent || null
    }
  };
};

/**
 * Format entry for display
 * Formater une entrée pour l'affichage
 * 
 * @param {Object} entry - Entry to format
 * @param {string} language - Display language
 * @returns {Object} Formatted entry
 */
const formatEntryForDisplay = (entry, language = 'en') => {
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return language === 'fr'
      ? date.toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };
  
  const getStatusLabel = (found) => {
    if (found) {
      return language === 'fr' ? 'Trouvé' : 'Found';
    }
    return language === 'fr' ? 'Non trouvé' : 'Not Found';
  };
  
  const getTypeLabel = (type) => {
    const labels = {
      single: { en: 'Single Search', fr: 'Recherche Simple' },
      batch: { en: 'Batch Search', fr: 'Recherche par Lots' },
      area: { en: 'Area Search', fr: 'Recherche par Zone' }
    };
    return labels[type]?.[language] || type;
  };
  
  return {
    ...entry,
    formattedTimestamp: formatDate(entry.timestamp),
    statusLabel: getStatusLabel(entry.result.found),
    typeLabel: getTypeLabel(entry.type),
    confidencePercentage: entry.result.confidence 
      ? Math.round(entry.result.confidence * 100) 
      : null
  };
};

module.exports = {
  validateEntry,
  createEntry,
  formatEntryForDisplay
};
