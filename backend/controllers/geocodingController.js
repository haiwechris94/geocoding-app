/**
 * Geocoding Controller
 * Contrôleur de Géocodage
 * 
 * Handle file upload, parse Excel/CSV, batch geocode villages.
 * Gérer le téléchargement de fichiers, analyser Excel/CSV, géocoder les villages par lots.
 */

const { parseFile, extractVillageNames, validateFile, getFilePreview } = require('../utils/excelParser');
const { validateFileUpload, validateVillageNames, validateFilters, sanitizeString } = require('../utils/validators');
const { geocodeSingleVillage, batchGeocodeVillages } = require('../services/geocodingService');
const { getCountryByCode } = require('../config/countries');
const path = require('path');
const fs = require('fs');

/**
 * Upload and parse file
 * Télécharger et analyser un fichier
 */
const uploadFile = async (req, res) => {
  try {
    // Validate file upload
    const fileValidation = validateFileUpload(req.file);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: fileValidation.error
      });
    }

    // Get file preview
    const preview = await getFilePreview(req.file.path, 10);
    
    if (!preview.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: preview.error
      });
    }

    res.json({
      success: true,
      message: {
        en: 'File uploaded successfully',
        fr: 'Fichier téléchargé avec succès'
      },
      data: {
        fileId: path.basename(req.file.path, path.extname(req.file.path)),
        fileName: req.file.originalname,
        filePath: req.file.path,
        headers: preview.headers,
        preview: preview.preview,
        totalRows: preview.totalRows,
        availableSheets: preview.availableSheets
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error uploading file',
        fr: 'Erreur lors du téléchargement du fichier'
      }
    });
  }
};

/**
 * Batch geocode villages from uploaded file
 * Géocoder des villages par lots à partir d'un fichier téléchargé
 */
const batchGeocodeFromFile = async (req, res) => {
  try {
    const { filePath, columnName, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate file path
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'File not found. Please upload the file again.',
          fr: 'Fichier non trouvé. Veuillez télécharger le fichier à nouveau.'
        }
      });
    }

    // Parse file
    const parsed = await parseFile(filePath);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error
      });
    }

    // Extract village names
    const extraction = extractVillageNames(parsed, columnName);
    if (!extraction.success) {
      return res.status(400).json({
        success: false,
        error: extraction.error,
        availableColumns: extraction.availableColumns
      });
    }

    // Validate filters
    const filterValidation = validateFilters(filters);
    if (!filterValidation.valid) {
      return res.status(400).json({
        success: false,
        error: filterValidation.errors
      });
    }

    // Enrich filters with country name if code provided
    const enrichedFilters = { ...filterValidation.filters, language: lang };
    if (enrichedFilters.countryCode) {
      const country = getCountryByCode(enrichedFilters.countryCode);
      if (country) {
        enrichedFilters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    // Perform batch geocoding
    const results = await batchGeocodeVillages(extraction.villages, enrichedFilters);

    // Clean up uploaded file after processing
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('Could not delete uploaded file:', e.message);
    }

    res.json({
      success: true,
      message: {
        en: `Geocoded ${results.statistics.found} of ${results.statistics.total} villages`,
        fr: `${results.statistics.found} villages géocodés sur ${results.statistics.total}`
      },
      data: {
        results: results.results,
        statistics: results.statistics,
        filters: enrichedFilters,
        columnUsed: extraction.columnUsed
      }
    });
  } catch (error) {
    console.error('Batch geocoding error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error during batch geocoding',
        fr: 'Erreur lors du géocodage par lots'
      }
    });
  }
};

/**
 * Batch geocode villages from manual entry
 * Géocoder des villages par lots à partir d'une saisie manuelle
 */
const batchGeocodeManual = async (req, res) => {
  try {
    const { villages, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate village names
    const validation = validateVillageNames(villages);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        details: validation.details
      });
    }

    // Validate filters
    const filterValidation = validateFilters(filters);
    if (!filterValidation.valid) {
      return res.status(400).json({
        success: false,
        error: filterValidation.errors
      });
    }

    // Enrich filters
    const enrichedFilters = { ...filterValidation.filters, language: lang };
    if (enrichedFilters.countryCode) {
      const country = getCountryByCode(enrichedFilters.countryCode);
      if (country) {
        enrichedFilters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    // Perform batch geocoding
    const results = await batchGeocodeVillages(validation.values, enrichedFilters);

    res.json({
      success: true,
      message: {
        en: `Geocoded ${results.statistics.found} of ${results.statistics.total} villages`,
        fr: `${results.statistics.found} villages géocodés sur ${results.statistics.total}`
      },
      data: {
        results: results.results,
        statistics: results.statistics,
        filters: enrichedFilters
      }
    });
  } catch (error) {
    console.error('Manual batch geocoding error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error during batch geocoding',
        fr: 'Erreur lors du géocodage par lots'
      }
    });
  }
};

/**
 * Geocode single village
 * Géocoder un seul village
 */
const geocodeSingle = async (req, res) => {
  try {
    const { villageName, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate village name
    const sanitized = sanitizeString(villageName);
    if (!sanitized || sanitized.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Village name is required (minimum 2 characters)',
          fr: 'Le nom du village est requis (minimum 2 caractères)'
        }
      });
    }

    // Validate filters
    const filterValidation = validateFilters(filters);
    if (!filterValidation.valid) {
      return res.status(400).json({
        success: false,
        error: filterValidation.errors
      });
    }

    // Enrich filters
    const enrichedFilters = { ...filterValidation.filters, language: lang };
    if (enrichedFilters.countryCode) {
      const country = getCountryByCode(enrichedFilters.countryCode);
      if (country) {
        enrichedFilters.country = lang === 'fr' ? country.nameFR : country.nameEN;
      }
    }

    // Perform geocoding
    const result = await geocodeSingleVillage(sanitized, enrichedFilters);

    res.json({
      success: true,
      data: {
        ...result,
        filters: enrichedFilters
      }
    });
  } catch (error) {
    console.error('Single geocoding error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error during geocoding',
        fr: 'Erreur lors du géocodage'
      }
    });
  }
};

/**
 * Get file columns for selection
 * Obtenir les colonnes du fichier pour la sélection
 */
const getFileColumns = async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'File not found',
          fr: 'Fichier non trouvé'
        }
      });
    }

    const preview = await getFilePreview(filePath, 3);
    
    if (!preview.success) {
      return res.status(400).json({
        success: false,
        error: preview.error
      });
    }

    res.json({
      success: true,
      data: {
        headers: preview.headers,
        preview: preview.preview,
        totalRows: preview.totalRows
      }
    });
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error reading file columns',
        fr: 'Erreur lors de la lecture des colonnes du fichier'
      }
    });
  }
};

// ===========================================
// AI-Powered Endpoints / Points de terminaison IA
// ===========================================

const deepseekService = require('../services/deepseekService');

/**
 * Get AI recommendations for search
 * Obtenir des recommandations IA pour la recherche
 */
const getAIRecommendations = async (req, res) => {
  try {
    const { query, context } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Search query is required (minimum 2 characters)',
          fr: 'La requête de recherche est requise (minimum 2 caractères)'
        }
      });
    }

    const recommendations = await deepseekService.getSearchRecommendations(
      query.trim(),
      context || {},
      lang
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error getting AI recommendations',
        fr: 'Erreur lors de l\'obtention des recommandations IA'
      }
    });
  }
};

/**
 * Get AI name suggestions
 * Obtenir des suggestions de noms par IA
 */
const getAINameSuggestions = async (req, res) => {
  try {
    const { villageName, countryCode, similarNames } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!villageName || villageName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Village name is required (minimum 2 characters)',
          fr: 'Le nom du village est requis (minimum 2 caractères)'
        }
      });
    }

    const suggestions = await deepseekService.suggestNameCorrections(
      villageName.trim(),
      countryCode || '',
      similarNames || [],
      lang
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('AI name suggestions error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error getting AI name suggestions',
        fr: 'Erreur lors de l\'obtention des suggestions de noms IA'
      }
    });
  }
};

/**
 * Explain confidence scores with AI
 * Expliquer les scores de confiance avec l'IA
 */
const explainConfidenceWithAI = async (req, res) => {
  try {
    const { confidenceDetails, villageName } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!confidenceDetails || !villageName) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Confidence details and village name are required',
          fr: 'Les détails de confiance et le nom du village sont requis'
        }
      });
    }

    const explanation = await deepseekService.explainConfidence(
      confidenceDetails,
      villageName,
      lang
    );

    res.json({
      success: true,
      data: explanation
    });
  } catch (error) {
    console.error('AI confidence explanation error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error getting AI confidence explanation',
        fr: 'Erreur lors de l\'obtention de l\'explication de confiance IA'
      }
    });
  }
};

/**
 * Get result context with AI
 * Obtenir le contexte du résultat avec l'IA
 */
const getResultContextWithAI = async (req, res) => {
  try {
    const { result, originalQuery } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    if (!result || !originalQuery) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Result and original query are required',
          fr: 'Le résultat et la requête originale sont requis'
        }
      });
    }

    const context = await deepseekService.provideResultContext(
      result,
      originalQuery,
      lang
    );

    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('AI result context error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error getting AI result context',
        fr: 'Erreur lors de l\'obtention du contexte IA'
      }
    });
  }
};

/**
 * Check AI service status
 * Vérifier le statut du service IA
 */
const getAIStatus = async (req, res) => {
  try {
    const status = await deepseekService.checkStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('AI status check error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error checking AI service status',
        fr: 'Erreur lors de la vérification du statut du service IA'
      }
    });
  }
};

module.exports = {
  uploadFile,
  batchGeocodeFromFile,
  batchGeocodeManual,
  geocodeSingle,
  getFileColumns,
  getAIRecommendations,
  getAINameSuggestions,
  explainConfidenceWithAI,
  getResultContextWithAI,
  getAIStatus
};