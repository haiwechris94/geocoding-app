const express = require('express');
const router = express.Router();
const proximityService = require('../services/proximityService');
const nominatimService = require('../services/nominatimService');

/**
 * POST /api/search/proximity
 * Search for villages within a radius of a point
 */
router.post('/proximity', async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10, query } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: true,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Validate radius
    const allowedRadii = [10, 20, 30, 50, 100];
    const searchRadius = allowedRadii.includes(radius) ? radius : 10;
    
    const result = await proximityService.searchWithinRadius(
      parseFloat(latitude),
      parseFloat(longitude),
      searchRadius,
      { query }
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/search/nearest
 * Find nearest villages to a point
 */
router.post('/nearest', async (req, res, next) => {
  try {
    const { latitude, longitude, limit = 10 } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: true,
        message: 'Latitude and longitude are required'
      });
    }
    
    const result = await proximityService.findNearest(
      parseFloat(latitude),
      parseFloat(longitude),
      Math.min(limit, 50) // Max 50 results
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/search/bounds
 * Search within geographic bounds
 */
router.post('/bounds', async (req, res, next) => {
  try {
    const { north, south, east, west, query } = req.body;
    
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        error: true,
        message: 'Bounding box coordinates (north, south, east, west) are required'
      });
    }
    
    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };
    
    const result = await nominatimService.searchInBounds(bounds, query || 'village');
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/distance
 * Calculate distance between two points
 */
router.get('/distance', (req, res) => {
  const { lat1, lon1, lat2, lon2 } = req.query;
  
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return res.status(400).json({
      error: true,
      message: 'All coordinates (lat1, lon1, lat2, lon2) are required'
    });
  }
  
  const distance = proximityService.calculateDistance(
    parseFloat(lat1),
    parseFloat(lon1),
    parseFloat(lat2),
    parseFloat(lon2)
  );
  
  res.json({
    success: true,
    point1: { latitude: parseFloat(lat1), longitude: parseFloat(lon1) },
    point2: { latitude: parseFloat(lat2), longitude: parseFloat(lon2) },
    distance: Math.round(distance * 100) / 100,
    unit: 'km'
  });
});

module.exports = router;
