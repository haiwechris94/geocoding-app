/**
 * Export Controller
 * Contrôleur d'Exportation
 * 
 * Generate Excel/CSV/PDF exports with results.
 * Générer des exportations Excel/CSV/PDF avec les résultats.
 */

const { generateExcel, generateCSV, generatePDF, generateExport } = require('../utils/exportUtils');
const { validateExportFormat } = require('../utils/validators');
const path = require('path');
const fs = require('fs');

/**
 * Export results to Excel
 * Exporter les résultats vers Excel
 */
const exportToExcel = async (req, res) => {
  try {
    const { results, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate results
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'No results to export',
          fr: 'Aucun résultat à exporter'
        }
      });
    }

    // Generate Excel file
    const exportResult = generateExcel(results, {
      language: lang,
      filters,
      outputDir: './uploads'
    });

    if (!exportResult.success) {
      return res.status(500).json({
        success: false,
        error: exportResult.error
      });
    }

    // Send file for download
    res.download(exportResult.filePath, exportResult.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      try {
        fs.unlinkSync(exportResult.filePath);
      } catch (e) {
        console.warn('Could not delete export file:', e.message);
      }
    });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error exporting to Excel',
        fr: 'Erreur lors de l\'exportation vers Excel'
      }
    });
  }
};

/**
 * Export results to CSV
 * Exporter les résultats vers CSV
 */
const exportToCSV = async (req, res) => {
  try {
    const { results, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate results
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'No results to export',
          fr: 'Aucun résultat à exporter'
        }
      });
    }

    // Generate CSV file
    const exportResult = generateCSV(results, {
      language: lang,
      filters,
      outputDir: './uploads'
    });

    if (!exportResult.success) {
      return res.status(500).json({
        success: false,
        error: exportResult.error
      });
    }

    // Send file for download
    res.download(exportResult.filePath, exportResult.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      try {
        fs.unlinkSync(exportResult.filePath);
      } catch (e) {
        console.warn('Could not delete export file:', e.message);
      }
    });
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error exporting to CSV',
        fr: 'Erreur lors de l\'exportation vers CSV'
      }
    });
  }
};

/**
 * Export results to PDF
 * Exporter les résultats vers PDF
 */
const exportToPDF = async (req, res) => {
  try {
    const { results, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate results
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'No results to export',
          fr: 'Aucun résultat à exporter'
        }
      });
    }

    // Generate PDF file
    const exportResult = await generatePDF(results, {
      language: lang,
      filters,
      outputDir: './uploads'
    });

    if (!exportResult.success) {
      return res.status(500).json({
        success: false,
        error: exportResult.error
      });
    }

    // Send file for download
    res.download(exportResult.filePath, exportResult.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      try {
        fs.unlinkSync(exportResult.filePath);
      } catch (e) {
        console.warn('Could not delete export file:', e.message);
      }
    });
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error exporting to PDF',
        fr: 'Erreur lors de l\'exportation vers PDF'
      }
    });
  }
};

/**
 * Export results to specified format
 * Exporter les résultats vers le format spécifié
 */
const exportResults = async (req, res) => {
  try {
    const { results, format, filters } = req.body;
    const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

    // Validate format
    const formatValidation = validateExportFormat(format);
    if (!formatValidation.valid) {
      return res.status(400).json({
        success: false,
        error: formatValidation.error
      });
    }

    // Validate results
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          en: 'No results to export',
          fr: 'Aucun résultat à exporter'
        }
      });
    }

    // Generate export
    const exportResult = await generateExport(results, formatValidation.value, {
      language: lang,
      filters,
      outputDir: './uploads'
    });

    if (!exportResult.success) {
      return res.status(500).json({
        success: false,
        error: exportResult.error
      });
    }

    // Send file for download
    res.download(exportResult.filePath, exportResult.fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      try {
        fs.unlinkSync(exportResult.filePath);
      } catch (e) {
        console.warn('Could not delete export file:', e.message);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: {
        en: 'Error exporting results',
        fr: 'Erreur lors de l\'exportation des résultats'
      }
    });
  }
};

/**
 * Get export formats
 * Obtenir les formats d'exportation
 */
const getExportFormats = (req, res) => {
  const lang = req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en';

  res.json({
    success: true,
    data: {
      formats: [
        {
          id: 'excel',
          name: 'Excel',
          extension: '.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          description: {
            en: 'Microsoft Excel spreadsheet with multiple sheets',
            fr: 'Feuille de calcul Microsoft Excel avec plusieurs feuilles'
          }
        },
        {
          id: 'csv',
          name: 'CSV',
          extension: '.csv',
          mimeType: 'text/csv',
          description: {
            en: 'Comma-separated values file',
            fr: 'Fichier de valeurs séparées par des virgules'
          }
        },
        {
          id: 'pdf',
          name: 'PDF',
          extension: '.pdf',
          mimeType: 'application/pdf',
          description: {
            en: 'Portable Document Format with formatted table',
            fr: 'Format de document portable avec tableau formaté'
          }
        }
      ]
    }
  });
};

module.exports = {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  exportResults,
  getExportFormats
};
