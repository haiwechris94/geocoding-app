/**
 * Filter Routes
 * Routes des Filtres
 */

const express = require('express');
const router = express.Router();

const {
  getAllCountries,
  getCountryRegions,
  getRegionDepartments,
  getDepartmentArrondissements,
  searchDivisions
} = require('../controllers/filterController');

const {
  searchByRadius,
  searchVillageWithProximity,
  getRadiusOptions,
  getDistance
} = require('../controllers/proximityController');

/**
 * @route GET /api/filters/countries
 * @desc Get all African countries
 */
router.get('/countries', getAllCountries);

/**
 * @route GET /api/filters/regions/:countryCode
 * @desc Get regions for a country
 */
router.get('/regions/:countryCode', getCountryRegions);

/**
 * @route GET /api/filters/departments/:regionId
 * @desc Get departments for a region
 */
router.get('/departments/:regionId', getRegionDepartments);

/**
 * @route GET /api/filters/arrondissements/:departmentId
 * @desc Get arrondissements for a department
 */
router.get('/arrondissements/:departmentId', getDepartmentArrondissements);

/**
 * @route GET /api/filters/search
 * @desc Search administrative divisions
 */
router.get('/search', searchDivisions);

/**
 * @route GET /api/filters/radius-options
 * @desc Get available radius options
 */
router.get('/radius-options', getRadiusOptions);

module.exports = router;
