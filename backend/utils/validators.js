/**
 * Input Validators
 * Validateurs d'Entrée
 * 
 * Validate input data, coordinates, file formats.
 * Valider les données d'entrée, coordonnées, formats de fichiers.
 */

const { uploadSettings } = require('../config/apiConfig');
const path = require('path');

/**
 * Validate latitude value
 * Valider une valeur de latitude
 * 
 * @param {number} lat - Latitude value
 * @returns {Object} Validation result
 */
const validateLatitude = (lat) => {
  const latitude = parseFloat(lat);
  
  if (isNaN(latitude)) {
    return {
      valid: false,
      error: {
        en: 'Latitude must be a number',
        fr: 'La latitude doit être un nombre'
      }
    };
  }

  if (latitude < -90 || latitude > 90) {
    return {
      valid: false,
      error: {
        en: 'Latitude must be between -90 and 90',
        fr: 'La latitude doit être comprise entre -90 et 90'
      }
    };
  }

  return { valid: true, value: latitude };
};

/**
 * Validate longitude value
 * Valider une valeur de longitude
 * 
 * @param {number} lng - Longitude value
 * @returns {Object} Validation result
 */
const validateLongitude = (lng) => {
  const longitude = parseFloat(lng);
  
  if (isNaN(longitude)) {
    return {
      valid: false,
      error: {
        en: 'Longitude must be a number',
        fr: 'La longitude doit être un nombre'
      }
    };
  }

  if (longitude < -180 || longitude > 180) {
    return {
      valid: false,
      error: {
        en: 'Longitude must be between -180 and 180',
        fr: 'La longitude doit être comprise entre -180 et 180'
      }
    };
  }

  return { valid: true, value: longitude };
};

/**
 * Validate coordinates pair
 * Valider une paire de coordonnées
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Validation result
 */
const validateCoordinates = (lat, lng) => {
  const latResult = validateLatitude(lat);
  if (!latResult.valid) return latResult;

  const lngResult = validateLongitude(lng);
  if (!lngResult.valid) return lngResult;

  return {
    valid: true,
    coordinates: {
      latitude: latResult.value,
      longitude: lngResult.value
    }
  };
};

/**
 * Validate village name
 * Valider un nom de village
 * 
 * @param {string} name - Village name
 * @returns {Object} Validation result
 */
const validateVillageName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: {
        en: 'Village name is required',
        fr: 'Le nom du village est requis'
      }
    };
  }

  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: {
        en: 'Village name cannot be empty',
        fr: 'Le nom du village ne peut pas être vide'
      }
    };
  }

  if (trimmed.length < 2) {
    return {
      valid: false,
      error: {
        en: 'Village name must be at least 2 characters',
        fr: 'Le nom du village doit contenir au moins 2 caractères'
      }
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      error: {
        en: 'Village name must be less than 200 characters',
        fr: 'Le nom du village doit contenir moins de 200 caractères'
      }
    };
  }

  return { valid: true, value: trimmed };
};

/**
 * Validate array of village names
 * Valider un tableau de noms de villages
 * 
 * @param {Array} names - Array of village names
 * @returns {Object} Validation result
 */
const validateVillageNames = (names) => {
  if (!Array.isArray(names)) {
    return {
      valid: false,
      error: {
        en: 'Village names must be an array',
        fr: 'Les noms de villages doivent être un tableau'
      }
    };
  }

  if (names.length === 0) {
    return {
      valid: false,
      error: {
        en: 'At least one village name is required',
        fr: 'Au moins un nom de village est requis'
      }
    };
  }

  if (names.length > 1000) {
    return {
      valid: false,
      error: {
        en: 'Maximum 1000 villages per batch',
        fr: 'Maximum 1000 villages par lot'
      }
    };
  }

  const validatedNames = [];
  const errors = [];

  names.forEach((name, index) => {
    const result = validateVillageName(name);
    if (result.valid) {
      validatedNames.push(result.value);
    } else {
      errors.push({ index, name, error: result.error });
    }
  });

  if (errors.length > 0 && validatedNames.length === 0) {
    return {
      valid: false,
      error: {
        en: 'No valid village names found',
        fr: 'Aucun nom de village valide trouvé'
      },
      details: errors
    };
  }

  return {
    valid: true,
    values: validatedNames,
    invalidCount: errors.length,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Validate radius value
 * Valider une valeur de rayon
 * 
 * @param {number} radius - Radius in kilometers
 * @returns {Object} Validation result
 */
const validateRadius = (radius) => {
  const r = parseFloat(radius);
  
  if (isNaN(r)) {
    return {
      valid: false,
      error: {
        en: 'Radius must be a number',
        fr: 'Le rayon doit être un nombre'
      }
    };
  }

  if (r <= 0) {
    return {
      valid: false,
      error: {
        en: 'Radius must be greater than 0',
        fr: 'Le rayon doit être supérieur à 0'
      }
    };
  }

  if (r > 500) {
    return {
      valid: false,
      error: {
        en: 'Radius must be less than 500km',
        fr: 'Le rayon doit être inférieur à 500km'
      }
    };
  }

  return { valid: true, value: r };
};

/**
 * Validate country code
 * Valider un code pays
 * 
 * @param {string} code - ISO country code
 * @returns {Object} Validation result
 */
const validateCountryCode = (code) => {
  if (!code || typeof code !== 'string') {
    return { valid: true, value: null }; // Optional field
  }

  const trimmed = code.trim().toUpperCase();
  
  // Accept both 2-letter and 3-letter codes
  if (trimmed.length !== 2 && trimmed.length !== 3) {
    return {
      valid: false,
      error: {
        en: 'Country code must be 2 or 3 characters (ISO format)',
        fr: 'Le code pays doit contenir 2 ou 3 caractères (format ISO)'
      }
    };
  }

  if (!/^[A-Z]+$/.test(trimmed)) {
    return {
      valid: false,
      error: {
        en: 'Country code must contain only letters',
        fr: 'Le code pays ne doit contenir que des lettres'
      }
    };
  }

  return { valid: true, value: trimmed };
};

/**
 * Validate file upload
 * Valider un téléchargement de fichier
 * 
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateFileUpload = (file) => {
  if (!file) {
    return {
      valid: false,
      error: {
        en: 'No file uploaded',
        fr: 'Aucun fichier téléchargé'
      }
    };
  }

  // Check file size
  if (file.size > uploadSettings.maxFileSize) {
    return {
      valid: false,
      error: {
        en: `File size exceeds maximum limit of ${Math.round(uploadSettings.maxFileSize / 1024 / 1024)}MB`,
        fr: `La taille du fichier dépasse la limite maximale de ${Math.round(uploadSettings.maxFileSize / 1024 / 1024)}Mo`
      }
    };
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!uploadSettings.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: {
        en: `Invalid file type. Allowed: ${uploadSettings.allowedExtensions.join(', ')}`,
        fr: `Type de fichier invalide. Autorisés: ${uploadSettings.allowedExtensions.join(', ')}`
      }
    };
  }

  // Check MIME type
  if (!uploadSettings.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: {
        en: 'Invalid file MIME type',
        fr: 'Type MIME de fichier invalide'
      }
    };
  }

  return {
    valid: true,
    file: {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      path: file.path
    }
  };
};

/**
 * Validate geocoding filters
 * Valider les filtres de géocodage
 * 
 * @param {Object} filters - Filter object
 * @returns {Object} Validation result
 */
const validateFilters = (filters) => {
  if (!filters || typeof filters !== 'object') {
    return { valid: true, filters: {} };
  }

  const validated = {};
  const errors = [];

  // Validate country code
  if (filters.countryCode) {
    const result = validateCountryCode(filters.countryCode);
    if (result.valid) {
      validated.countryCode = result.value;
    } else {
      errors.push({ field: 'countryCode', error: result.error });
    }
  }

  // Validate country name (string)
  if (filters.country && typeof filters.country === 'string') {
    validated.country = filters.country.trim();
  }

  // Validate region (string)
  if (filters.region && typeof filters.region === 'string') {
    validated.region = filters.region.trim();
  }

  // Validate department (string)
  if (filters.department && typeof filters.department === 'string') {
    validated.department = filters.department.trim();
  }

  // Validate arrondissement (string)
  if (filters.arrondissement && typeof filters.arrondissement === 'string') {
    validated.arrondissement = filters.arrondissement.trim();
  }

  // Validate language
  if (filters.language) {
    const lang = filters.language.toLowerCase();
    if (['en', 'fr'].includes(lang)) {
      validated.language = lang;
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return { valid: true, filters: validated };
};

/**
 * Validate export format
 * Valider le format d'exportation
 * 
 * @param {string} format - Export format
 * @returns {Object} Validation result
 */
const validateExportFormat = (format) => {
  const validFormats = ['excel', 'xlsx', 'csv', 'pdf'];
  
  if (!format || typeof format !== 'string') {
    return {
      valid: false,
      error: {
        en: 'Export format is required',
        fr: 'Le format d\'exportation est requis'
      }
    };
  }

  const normalized = format.toLowerCase().trim();
  
  if (!validFormats.includes(normalized)) {
    return {
      valid: false,
      error: {
        en: `Invalid export format. Allowed: ${validFormats.join(', ')}`,
        fr: `Format d'exportation invalide. Autorisés: ${validFormats.join(', ')}`
      }
    };
  }

  return { valid: true, value: normalized };
};

/**
 * Sanitize string input
 * Assainir une entrée de chaîne
 * 
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
const sanitizeString = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 500); // Limit length
};

module.exports = {
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  validateVillageName,
  validateVillageNames,
  validateRadius,
  validateCountryCode,
  validateFileUpload,
  validateFilters,
  validateExportFormat,
  sanitizeString
};
