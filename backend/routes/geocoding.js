/**
 * Geocoding Routes
 * Routes de Géocodage
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const {
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
} = require('../controllers/geocodingController');
const opencageService = require('../services/opencageService');
const nominatimService = require('../services/nominatimService');
const { apiConfig } = require('../config/apiConfig');
const searchHistoryService = require('../services/searchHistoryService');
const deepseekService = require('../services/deepseekService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 || 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

/**
 * @route POST /api/geocoding/upload
 * @desc Upload Excel/CSV file
 */
router.post('/upload', upload.single('file'), uploadFile);

/**
 * @route POST /api/geocoding/batch
 * @desc Batch geocode villages from uploaded file
 */
router.post('/batch', batchGeocodeFromFile);

/**
 * @route POST /api/geocoding/batch-manual
 * @desc Batch geocode villages from manual entry
 */
router.post('/batch-manual', batchGeocodeManual);

/**
 * @route POST /api/geocoding/single
 * @desc Geocode single village
 */
router.post('/single', geocodeSingle);

/**
 * @route GET /api/geocoding/columns
 * @desc Get file columns for selection
 */
router.get('/columns', getFileColumns);

/**
 * @route GET /api/geocoding/sources/status
 * @desc Get status of all geocoding sources
 */
router.get('/sources/status', async (req, res) => {
  try {
    // Check OpenCage status
    const opencageStatus = await opencageService.checkStatus();
    
    // Build status for all sources
    const sourcesStatus = {
      googleMaps: {
        enabled: apiConfig.googleMaps.enabled,
        available: apiConfig.googleMaps.enabled,
        reliability: apiConfig.googleMaps.reliability,
        rateLimit: apiConfig.googleMaps.rateLimit
      },
      geoNames: {
        enabled: apiConfig.geoNames.enabled,
        available: apiConfig.geoNames.enabled,
        reliability: apiConfig.geoNames.reliability,
        rateLimit: apiConfig.geoNames.rateLimit
      },
      nominatim: {
        enabled: apiConfig.nominatim.enabled,
        available: true, // Always available (free)
        reliability: apiConfig.nominatim.reliability,
        rateLimit: apiConfig.nominatim.rateLimit
      },
      photon: {
        enabled: apiConfig.photon.enabled,
        available: true, // Always available (free)
        reliability: apiConfig.photon.reliability,
        rateLimit: apiConfig.photon.rateLimit
      },
      openCage: {
        enabled: apiConfig.openCage?.enabled || false,
        available: opencageStatus.available,
        reliability: apiConfig.openCage?.reliability || 0.82,
        rateLimit: apiConfig.openCage?.rateLimit || { requestsPerDay: 2500 },
        remaining: opencageStatus.remaining,
        limit: opencageStatus.limit
      },
      hdx: {
        enabled: apiConfig.hdx.enabled,
        available: apiConfig.hdx.enabled,
        reliability: apiConfig.hdx.reliability,
        rateLimit: apiConfig.hdx.rateLimit
      }
    };

    res.json({
      success: true,
      data: {
        sources: sourcesStatus,
        totalEnabled: Object.values(sourcesStatus).filter(s => s.enabled).length,
        totalAvailable: Object.values(sourcesStatus).filter(s => s.available).length
      }
    });
  } catch (error) {
    console.error('Error checking sources status:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error checking geocoding sources status',
        fr: 'Erreur lors de la vérification du statut des sources de géocodage'
      }
    });
  }
});

// ===========================================
// AI-Powered Routes / Routes IA
// ===========================================

/**
 * @route POST /api/ai/recommend
 * @desc Get AI recommendations for search
 */
router.post('/ai/recommend', getAIRecommendations);

/**
 * @route POST /api/ai/suggest-names
 * @desc Get AI name suggestions
 */
router.post('/ai/suggest-names', getAINameSuggestions);

/**
 * @route POST /api/ai/explain-confidence
 * @desc Explain confidence scores with AI
 */
router.post('/ai/explain-confidence', explainConfidenceWithAI);

/**
 * @route POST /api/ai/result-context
 * @desc Get result context with AI
 */
router.post('/ai/result-context', getResultContextWithAI);

/**
 * @route GET /api/ai/status
 * @desc Check AI service status
 */
router.get('/ai/status', getAIStatus);

// ===========================================
// Search Area Routes / Routes de Recherche par Zone
// ===========================================

/**
 * @route POST /api/geocoding/search-area
 * @desc Multi-source area search with strict radius filtering
 */
router.post('/search-area', async (req, res) => {
  try {
    const { villageName, center, radius, filters } = req.body;
    
    if (!villageName || !center || !center.lat || !center.lng || !radius) {
      return res.status(400).json({ 
        success: false, 
        error: 'villageName, center (lat/lng), and radius are required' 
      });
    }

    const radiusKm = parseFloat(radius);
    if (isNaN(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid radius value' });
    }

    const { multiSourceAreaSearch } = require('../services/multiSourceAreaSearch');
    const searchData = await multiSourceAreaSearch(villageName, center, radiusKm);

    // Get AI recommendations if DeepSeek is available
    let aiRecommendations = null;
    try {
      const topResults = searchData.sourceResults
        .flatMap(s => s.results.slice(0, 3))
        .slice(0, 10);
      
      if (topResults.length > 0 && deepseekService) {
        const prompt = `Tu es un expert en géocodage africain. L'utilisateur recherche le village "${villageName}" dans un rayon de ${radiusKm} km autour de (${center.lat}, ${center.lng}).

Voici les résultats trouvés par différentes sources:
${topResults.map(r => `- ${r.name} (${r.source}): ${r.distance}km, similarité ${Math.round((r.similarity||0)*100)}%`).join('\n')}

Noms similaires trouvés: ${searchData.similarNames.join(', ') || 'aucun'}

Donne tes recommandations en JSON avec ce format exact:
{
  "bestMatch": "nom du meilleur résultat",
  "confidence": "haute|moyenne|faible",
  "reasoning": "explication courte",
  "alternativeNames": ["nom1", "nom2"],
  "tips": "conseil pour affiner la recherche"
}`;

        const systemPrompt = "Tu es un expert en géographie africaine et en géocodage de villages. Réponds uniquement en JSON valide.";
        const aiResp = await deepseekService.sendChatRequest(systemPrompt, prompt, 'fr');
        if (aiResp) {
          try {
            const jsonMatch = aiResp.match(/\{[\s\S]*\}/);
            if (jsonMatch) aiRecommendations = JSON.parse(jsonMatch[0]);
          } catch(e) {
            aiRecommendations = { reasoning: aiResp, confidence: 'unknown' };
          }
        }
      }
    } catch(aiErr) {
      console.warn('AI recommendations unavailable:', aiErr.message);
    }

    // Log to search history
    searchHistoryService.addSearchEntry({
      query: `Multi-source search: ${villageName}`,
      type: 'area',
      filters: { center, radius: radiusKm, villageName },
      found: searchData.totalResults > 0,
      confidence: searchData.totalResults > 0 ? 0.8 : 0
    });

    res.json({
      success: true,
      data: {
        ...searchData,
        aiRecommendations
      }
    });

  } catch (error) {
    console.error('Multi-source area search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ===========================================
// Search History Routes / Routes d'Historique de Recherche
// ===========================================

/**
 * @route GET /api/geocoding/history
 * @desc Get search history
 */
router.get('/history', (req, res) => {
  try {
    const { page, limit, startDate, endDate, query, type, found, countryCode } = req.query;
    
    const history = searchHistoryService.getSearchHistory({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      startDate,
      endDate,
      query,
      type,
      found: found !== undefined ? found === 'true' : null,
      countryCode
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error retrieving search history',
        fr: 'Erreur lors de la récupération de l\'historique'
      }
    });
  }
});

/**
 * @route GET /api/geocoding/history/stats
 * @desc Get search history statistics
 */
router.get('/history/stats', (req, res) => {
  try {
    const stats = searchHistoryService.getSearchStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get history stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error retrieving statistics',
        fr: 'Erreur lors de la récupération des statistiques'
      }
    });
  }
});

/**
 * @route POST /api/geocoding/history/ai-insights
 * @desc Get AI insights from search history
 */
router.post('/history/ai-insights', async (req, res) => {
  try {
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';
    const insights = await searchHistoryService.analyzeSearchPatterns(lang);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('History AI insights error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error generating AI insights',
        fr: 'Erreur lors de la génération des insights IA'
      }
    });
  }
});

/**
 * @route DELETE /api/geocoding/history/:id
 * @desc Delete a history entry
 */
router.delete('/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = searchHistoryService.deleteHistoryEntry(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          en: 'History entry not found',
          fr: 'Entrée d\'historique non trouvée'
        }
      });
    }

    res.json({
      success: true,
      message: {
        en: 'History entry deleted',
        fr: 'Entrée d\'historique supprimée'
      }
    });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error deleting history entry',
        fr: 'Erreur lors de la suppression'
      }
    });
  }
});

/**
 * @route DELETE /api/geocoding/history
 * @desc Clear all search history
 */
router.delete('/history', (req, res) => {
  try {
    const cleared = searchHistoryService.clearAllHistory();

    if (!cleared) {
      return res.status(500).json({
        success: false,
        error: {
          en: 'Error clearing history',
          fr: 'Erreur lors de l\'effacement de l\'historique'
        }
      });
    }

    res.json({
      success: true,
      message: {
        en: 'Search history cleared',
        fr: 'Historique de recherche effacé'
      }
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error clearing history',
        fr: 'Erreur lors de l\'effacement de l\'historique'
      }
    });
  }
});

/**
 * @route GET /api/geocoding/history/export
 * @desc Export search history
 */
router.get('/history/export', (req, res) => {
  try {
    const { format } = req.query;
    const exportData = searchHistoryService.exportHistory(format || 'json');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${exportData.filename}`);
      res.send(exportData.data);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error exporting history',
        fr: 'Erreur lors de l\'exportation de l\'historique'
      }
    });
  }
});

// ===========================================
// Village Information Routes / Routes d'Information sur les Villages
// ===========================================

/**
 * @route POST /api/geocoding/village-info
 * @desc Get AI-powered village information
 */
router.post('/village-info', async (req, res) => {
  try {
    const { villageName, latitude, longitude } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate required fields
    if (!villageName || villageName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Village name is required',
          fr: 'Le nom du village est requis'
        }
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Latitude and longitude are required',
          fr: 'La latitude et la longitude sont requises'
        }
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
          fr: 'Coordonnées invalides. La latitude doit être entre -90 et 90, la longitude entre -180 et 180'
        }
      });
    }

    // Get village information from DeepSeek AI
    const result = await deepseekService.getVillageInformation(
      villageName.trim(),
      parseFloat(latitude),
      parseFloat(longitude),
      lang
    );

    res.json({
      success: true,
      message: {
        en: `Information retrieved for ${villageName}`,
        fr: `Informations récupérées pour ${villageName}`
      },
      data: result.data
    });
  } catch (error) {
    console.error('Village info error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: error.message || 'Error retrieving village information',
        fr: error.message || 'Erreur lors de la récupération des informations du village'
      }
    });
  }
});

module.exports = router;