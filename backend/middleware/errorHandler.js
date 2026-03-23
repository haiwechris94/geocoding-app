/**
 * Error Handler Middleware
 * Middleware de Gestion des Erreurs
 * 
 * Centralized error handling with:
 * - Detailed error messages
 * - Error logging
 * - User-friendly error responses
 */

const monitoringService = require('../services/monitoringService');

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Error messages in multiple languages
 */
const errorMessages = {
  VALIDATION_ERROR: {
    en: 'Validation error',
    fr: 'Erreur de validation'
  },
  NOT_FOUND: {
    en: 'Resource not found',
    fr: 'Ressource non trouvée'
  },
  UNAUTHORIZED: {
    en: 'Authentication required',
    fr: 'Authentification requise'
  },
  FORBIDDEN: {
    en: 'Access denied',
    fr: 'Accès refusé'
  },
  RATE_LIMITED: {
    en: 'Too many requests, please try again later',
    fr: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  SERVICE_UNAVAILABLE: {
    en: 'Service temporarily unavailable',
    fr: 'Service temporairement indisponible'
  },
  INTERNAL_ERROR: {
    en: 'Internal server error',
    fr: 'Erreur interne du serveur'
  },
  FILE_TOO_LARGE: {
    en: 'File size exceeds the maximum limit',
    fr: 'La taille du fichier dépasse la limite maximale'
  },
  INVALID_FILE_TYPE: {
    en: 'Invalid file type',
    fr: 'Type de fichier invalide'
  },
  GEOCODING_ERROR: {
    en: 'Error during geocoding',
    fr: 'Erreur lors du géocodage'
  },
  AI_SERVICE_ERROR: {
    en: 'AI service error',
    fr: 'Erreur du service IA'
  },
  DATABASE_ERROR: {
    en: 'Database error',
    fr: 'Erreur de base de données'
  },
  NETWORK_ERROR: {
    en: 'Network error',
    fr: 'Erreur réseau'
  }
};

/**
 * Get localized error message
 */
function getLocalizedMessage(code, lang = 'en', customMessage = null) {
  const messages = errorMessages[code] || errorMessages.INTERNAL_ERROR;
  return customMessage || messages[lang] || messages.en;
}

/**
 * Format error response
 */
function formatErrorResponse(error, lang = 'en', includeStack = false) {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: {
        en: getLocalizedMessage(error.code, 'en', error.message),
        fr: getLocalizedMessage(error.code, 'fr')
      }
    }
  };

  if (error.details && error.details.length > 0) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Main error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  console.error('Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Track error in monitoring service
  try {
    monitoringService.trackError({
      type: err.code || 'UNKNOWN',
      message: err.message,
      stack: err.stack,
      endpoint: req.path,
      method: req.method,
      statusCode: err.statusCode || 500,
      context: {
        query: req.query,
        body: req.body ? Object.keys(req.body) : [],
        headers: {
          'user-agent': req.get('User-Agent'),
          'accept-language': req.get('Accept-Language')
        }
      }
    });
  } catch (trackingError) {
    console.error('Error tracking failed:', trackingError);
  }

  // Determine language from request
  const lang = req.get('Accept-Language')?.startsWith('fr') ? 'fr' : 'en';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle specific error types
  
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(formatErrorResponse({
      code: 'FILE_TOO_LARGE',
      message: errorMessages.FILE_TOO_LARGE[lang]
    }, lang));
  }

  // Multer file type error
  if (err.message === 'Invalid file type') {
    return res.status(400).json(formatErrorResponse({
      code: 'INVALID_FILE_TYPE',
      message: errorMessages.INVALID_FILE_TYPE[lang]
    }, lang));
  }

  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json(formatErrorResponse({
      code: 'VALIDATION_ERROR',
      message: lang === 'fr' ? 'JSON invalide' : 'Invalid JSON'
    }, lang));
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(formatErrorResponse({
      code: 'VALIDATION_ERROR',
      message: errorMessages.VALIDATION_ERROR[lang],
      details
    }, lang));
  }

  // Custom AppError
  if (err.isOperational) {
    return res.status(err.statusCode).json(
      formatErrorResponse(err, lang, isDevelopment)
    );
  }

  // Unhandled errors
  const statusCode = err.statusCode || 500;
  const response = formatErrorResponse({
    code: statusCode === 500 ? 'INTERNAL_ERROR' : err.code || 'ERROR',
    message: statusCode === 500 ? errorMessages.INTERNAL_ERROR[lang] : err.message
  }, lang, isDevelopment);

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const lang = req.get('Accept-Language')?.startsWith('fr') ? 'fr' : 'en';
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: {
        en: `Route ${req.originalUrl} not found`,
        fr: `Route ${req.originalUrl} non trouvée`
      }
    }
  });
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create error with code
 */
function createError(code, message, statusCode = 500) {
  const error = new AppError(message, statusCode, code);
  return error;
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ServiceUnavailableError,
  errorMessages,
  getLocalizedMessage,
  formatErrorResponse
};
