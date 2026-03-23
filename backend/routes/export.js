/**
 * Export Routes
 * Routes d'Exportation
 */

const express = require('express');
const router = express.Router();

const {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  exportResults,
  getExportFormats
} = require('../controllers/exportController');

/**
 * @route POST /api/export/excel
 * @desc Export results to Excel
 */
router.post('/excel', exportToExcel);

/**
 * @route POST /api/export/csv
 * @desc Export results to CSV
 */
router.post('/csv', exportToCSV);

/**
 * @route POST /api/export/pdf
 * @desc Export results to PDF
 */
router.post('/pdf', exportToPDF);

/**
 * @route POST /api/export
 * @desc Export results to specified format
 */
router.post('/', exportResults);

/**
 * @route GET /api/export/formats
 * @desc Get available export formats
 */
router.get('/formats', getExportFormats);

module.exports = router;
