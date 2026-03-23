/**
 * Validator Middleware
 * Middleware de Validation
 * 
 * Request validation with:
 * - Schema validation for all endpoints
 * - Sanitize user inputs
 * - Custom validation rules
 */

const { ValidationError } = require('./errorHandler');

/**
 * Validation schemas
 */
const schemas = {
  // Geocoding single
  geocodingSingle: {
    body: {
      villageName: { type: 'string', required: true, minLength: 1, maxLength: 200 },
      countryCode: { type: 'string', required: false, pattern: /^[A-Z]{2}$/ },
      region: { type: 'string', required: false, maxLength: 100 },
      department: { type: 'string', required: false, maxLength: 100 },
      arrondissement: { type: 'string', required: false, maxLength: 100 }
    }
  },

  // Geocoding batch manual
  geocodingBatchManual: {
    body: {
      villages: { type: 'array', required: true, minLength: 1, maxLength: 1000 },
      filters: { type: 'object', required: false }
    }
  },

  // Search area
  searchArea: {
    body: {
      center: { 
        type: 'object', 
        required: true,
        properties: {
          lat: { type: 'number', required: true, min: -90, max: 90 },
          lng: { type: 'number', required: true, min: -180, max: 180 }
        }
      },
      radius: { type: 'number', required: false, min: 1, max: 100, default: 20 },
      countryCode: { type: 'string', required: false, pattern: /^[A-Z]{2}$/ }
    }
  },

  // AI recommend
  aiRecommend: {
    body: {
      villageName: { type: 'string', required: true, minLength: 1, maxLength: 200 },
      countryCode: { type: 'string', required: false, pattern: /^[A-Z]{2}$/ },
      context: { type: 'string', required: false, maxLength: 500 }
    }
  },

  // History query
  historyQuery: {
    query: {
      page: { type: 'number', required: false, min: 1, default: 1 },
      limit: { type: 'number', required: false, min: 1, max: 100, default: 50 },
      startDate: { type: 'date', required: false },
      endDate: { type: 'date', required: false },
      query: { type: 'string', required: false, maxLength: 200 },
      type: { type: 'string', required: false, enum: ['single', 'batch', 'area'] },
      found: { type: 'boolean', required: false },
      countryCode: { type: 'string', required: false, pattern: /^[A-Z]{2}$/ }
    }
  },

  // Webhook registration
  webhookRegister: {
    body: {
      url: { type: 'string', required: true, pattern: /^https?:\/\/.+/ },
      name: { type: 'string', required: false, maxLength: 100 },
      events: { type: 'array', required: true, minLength: 1 },
      headers: { type: 'object', required: false }
    }
  },

  // Report generation
  reportGenerate: {
    body: {
      type: { type: 'string', required: true, enum: ['batch_summary', 'search_history', 'statistics', 'custom'] },
      data: { type: 'array', required: false },
      options: { type: 'object', required: false },
      format: { type: 'string', required: false, enum: ['pdf', 'excel', 'csv', 'json'], default: 'json' }
    }
  }
};

/**
 * Sanitize string input
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate value against schema
 */
function validateValue(value, schema, fieldName) {
  const errors = [];

  // Check required
  if (schema.required && (value === undefined || value === null || value === '')) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      messageFr: `${fieldName} est requis`
    });
    return errors;
  }

  // Skip validation if not required and empty
  if (!schema.required && (value === undefined || value === null)) {
    return errors;
  }

  // Type validation
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (schema.type === 'date') {
      if (isNaN(Date.parse(value))) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a valid date`,
          messageFr: `${fieldName} doit être une date valide`
        });
      }
    } else if (schema.type === 'number' && actualType === 'string') {
      // Try to parse number from string
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a number`,
          messageFr: `${fieldName} doit être un nombre`
        });
      }
    } else if (actualType !== schema.type) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be of type ${schema.type}`,
        messageFr: `${fieldName} doit être de type ${schema.type}`
      });
      return errors;
    }
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${schema.minLength} characters`,
        messageFr: `${fieldName} doit contenir au moins ${schema.minLength} caractères`
      });
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at most ${schema.maxLength} characters`,
        messageFr: `${fieldName} doit contenir au maximum ${schema.maxLength} caractères`
      });
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} has invalid format`,
        messageFr: `${fieldName} a un format invalide`
      });
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be one of: ${schema.enum.join(', ')}`,
        messageFr: `${fieldName} doit être l'un des suivants: ${schema.enum.join(', ')}`
      });
    }
  }

  // Number validations
  if (schema.type === 'number') {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (schema.min !== undefined && numValue < schema.min) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${schema.min}`,
        messageFr: `${fieldName} doit être au moins ${schema.min}`
      });
    }
    if (schema.max !== undefined && numValue > schema.max) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at most ${schema.max}`,
        messageFr: `${fieldName} doit être au maximum ${schema.max}`
      });
    }
  }

  // Array validations
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must have at least ${schema.minLength} items`,
        messageFr: `${fieldName} doit contenir au moins ${schema.minLength} éléments`
      });
    }
    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must have at most ${schema.maxLength} items`,
        messageFr: `${fieldName} doit contenir au maximum ${schema.maxLength} éléments`
      });
    }
  }

  // Object validations (nested)
  if (schema.type === 'object' && schema.properties && typeof value === 'object') {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const propErrors = validateValue(value[propName], propSchema, `${fieldName}.${propName}`);
      errors.push(...propErrors);
    }
  }

  return errors;
}

/**
 * Create validation middleware
 */
function validate(schemaName) {
  const schema = schemas[schemaName];
  
  if (!schema) {
    console.warn(`Validation schema '${schemaName}' not found`);
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const errors = [];

    // Sanitize inputs
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    // Validate body
    if (schema.body) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.body)) {
        const fieldErrors = validateValue(req.body?.[fieldName], fieldSchema, fieldName);
        errors.push(...fieldErrors);

        // Apply default values
        if (fieldSchema.default !== undefined && req.body?.[fieldName] === undefined) {
          if (!req.body) req.body = {};
          req.body[fieldName] = fieldSchema.default;
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.query)) {
        const fieldErrors = validateValue(req.query?.[fieldName], fieldSchema, fieldName);
        errors.push(...fieldErrors);

        // Apply default values
        if (fieldSchema.default !== undefined && req.query?.[fieldName] === undefined) {
          if (!req.query) req.query = {};
          req.query[fieldName] = fieldSchema.default;
        }

        // Convert types for query params
        if (req.query?.[fieldName] !== undefined) {
          if (fieldSchema.type === 'number') {
            req.query[fieldName] = parseFloat(req.query[fieldName]);
          } else if (fieldSchema.type === 'boolean') {
            req.query[fieldName] = req.query[fieldName] === 'true';
          }
        }
      }
    }

    // Validate params
    if (schema.params) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.params)) {
        const fieldErrors = validateValue(req.params?.[fieldName], fieldSchema, fieldName);
        errors.push(...fieldErrors);
      }
    }

    if (errors.length > 0) {
      const lang = req.get('Accept-Language')?.startsWith('fr') ? 'fr' : 'en';
      const formattedErrors = errors.map(e => ({
        field: e.field,
        message: lang === 'fr' ? e.messageFr : e.message
      }));

      return next(new ValidationError(
        lang === 'fr' ? 'Erreur de validation' : 'Validation error',
        formattedErrors
      ));
    }

    next();
  };
}

/**
 * Custom validators
 */
const customValidators = {
  isValidCoordinates: (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  isValidCountryCode: (code) => {
    return /^[A-Z]{2}$/.test(code);
  },

  isValidEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidDate: (date) => {
    return !isNaN(Date.parse(date));
  },

  isValidUUID: (uuid) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }
};

/**
 * Sanitize middleware (standalone)
 */
function sanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = {
  validate,
  sanitize,
  sanitizeString,
  sanitizeObject,
  validateValue,
  customValidators,
  schemas
};
