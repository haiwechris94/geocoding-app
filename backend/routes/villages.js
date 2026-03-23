/**
 * Villages Routes
 * Routes des Villages
 */

const express = require('express');
const router = express.Router();

const {
  searchVillage,
  getVillageSuggestions,
  validateVillageCoordinates
} = require('../controllers/villageController');

/**
 * @route GET /api/villages/search
 * @desc Search for a single village
 */
router.get('/search', searchVillage);

/**
 * @route GET /api/villages/suggestions
 * @desc Get village suggestions (autocomplete)
 */
router.get('/suggestions', getVillageSuggestions);

/**
 * @route POST /api/villages/validate
 * @desc Validate village coordinates
 */
router.post('/validate', validateVillageCoordinates);

module.exports = router;
