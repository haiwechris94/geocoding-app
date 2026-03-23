/**
 * Export Utilities
 * Utilitaires d'Exportation
 * 
 * Generate Excel files (xlsx), CSV files, and PDF files with tables.
 * Générer des fichiers Excel (xlsx), CSV et PDF avec des tableaux.
 */

const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exportSettings } = require('../config/apiConfig');

/**
 * Generate Excel file from geocoding results
 * Générer un fichier Excel à partir des résultats de géocodage
 * 
 * @param {Array} results - Geocoding results
 * @param {Object} options - Export options
 * @returns {Object} Export result with file path
 */
const generateExcel = (results, options = {}) => {
  try {
    const lang = options.language || 'en';
    const sheetName = lang === 'fr' 
      ? exportSettings.excel.sheetNameFR 
      : exportSettings.excel.sheetName;

    // Prepare data for Excel
    const headers = lang === 'fr'
      ? ['Nom du Village', 'Adresse Formatée', 'Latitude', 'Longitude', 'Source', 'Confiance', 'Pays', 'Région', 'Département', 'Proximité Frontière', 'Distance Frontière (km)', 'Trouvé']
      : ['Village Name', 'Formatted Address', 'Latitude', 'Longitude', 'Source', 'Confidence', 'Country', 'Region', 'Department', 'Border Proximity', 'Border Distance (km)', 'Found'];

    const data = results.map(r => [
      r.villageName || '',
      r.formattedAddressDisplay || r.formattedAddress || '',
      r.latitude || '',
      r.longitude || '',
      r.source || '',
      r.confidence ? `${Math.round(r.confidence * 100)}%` : '',
      r.filters?.country || '',
      r.filters?.region || '',
      r.filters?.department || '',
      r.borderProximity ? (lang === 'fr' ? r.borderProximity.labelFR : r.borderProximity.labelEN) : '',
      r.borderProximity ? r.borderProximity.distance : '',
      r.found ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No')
    ]);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Village Name
      { wch: 12 }, // Latitude
      { wch: 12 }, // Longitude
      { wch: 15 }, // Source
      { wch: 10 }, // Confidence
      { wch: 15 }, // Country
      { wch: 15 }, // Region
      { wch: 15 }, // Department
      { wch: 8 },  // Found
      { wch: 40 }  // Formatted Address
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Add statistics sheet
    const statsHeaders = lang === 'fr'
      ? ['Statistique', 'Valeur']
      : ['Statistic', 'Value'];
    
    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found).length;
    const avgConfidence = results.filter(r => r.confidence)
      .reduce((sum, r) => sum + r.confidence, 0) / (found || 1);

    const statsData = [
      [lang === 'fr' ? 'Total des villages' : 'Total Villages', results.length],
      [lang === 'fr' ? 'Trouvés' : 'Found', found],
      [lang === 'fr' ? 'Non trouvés' : 'Not Found', notFound],
      [lang === 'fr' ? 'Taux de réussite' : 'Success Rate', `${Math.round((found / results.length) * 100)}%`],
      [lang === 'fr' ? 'Confiance moyenne' : 'Average Confidence', `${Math.round(avgConfidence * 100)}%`],
      [lang === 'fr' ? 'Date d\'exportation' : 'Export Date', new Date().toISOString()]
    ];

    const statsWs = XLSX.utils.aoa_to_sheet([statsHeaders, ...statsData]);
    statsWs['!cols'] = [{ wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, statsWs, lang === 'fr' ? 'Statistiques' : 'Statistics');

    // Generate file
    const fileName = `geocoding_results_${Date.now()}.xlsx`;
    const filePath = path.join(options.outputDir || './uploads', fileName);
    
    XLSX.writeFile(wb, filePath);

    return {
      success: true,
      filePath,
      fileName,
      format: 'xlsx',
      message: {
        en: 'Excel file generated successfully',
        fr: 'Fichier Excel généré avec succès'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        en: `Error generating Excel: ${error.message}`,
        fr: `Erreur lors de la génération Excel: ${error.message}`
      }
    };
  }
};

/**
 * Generate CSV file from geocoding results
 * Générer un fichier CSV à partir des résultats de géocodage
 * 
 * @param {Array} results - Geocoding results
 * @param {Object} options - Export options
 * @returns {Object} Export result with file path
 */
const generateCSV = (results, options = {}) => {
  try {
    const lang = options.language || 'en';
    const delimiter = options.delimiter || exportSettings.csv.delimiter;

    // Prepare headers
    const headers = lang === 'fr'
      ? ['Nom du Village', 'Adresse Formatée', 'Latitude', 'Longitude', 'Source', 'Confiance', 'Pays', 'Région', 'Département', 'Proximité Frontière', 'Distance Frontière (km)', 'Trouvé']
      : ['Village Name', 'Formatted Address', 'Latitude', 'Longitude', 'Source', 'Confidence', 'Country', 'Region', 'Department', 'Border Proximity', 'Border Distance (km)', 'Found'];

    // Prepare rows
    const rows = results.map(r => [
      escapeCSV(r.villageName || ''),
      escapeCSV(r.formattedAddressDisplay || r.formattedAddress || ''),
      r.latitude || '',
      r.longitude || '',
      escapeCSV(r.source || ''),
      r.confidence ? `${Math.round(r.confidence * 100)}%` : '',
      escapeCSV(r.filters?.country || ''),
      escapeCSV(r.filters?.region || ''),
      escapeCSV(r.filters?.department || ''),
      r.borderProximity ? (lang === 'fr' ? r.borderProximity.labelFR : r.borderProximity.labelEN) : '',
      r.borderProximity ? r.borderProximity.distance : '',
      r.found ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No')
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(delimiter),
      ...rows.map(row => row.join(delimiter))
    ].join('\n');

    // Generate file
    const fileName = `geocoding_results_${Date.now()}.csv`;
    const filePath = path.join(options.outputDir || './uploads', fileName);
    
    fs.writeFileSync(filePath, '\ufeff' + csvContent, 'utf8'); // BOM for Excel compatibility

    return {
      success: true,
      filePath,
      fileName,
      format: 'csv',
      message: {
        en: 'CSV file generated successfully',
        fr: 'Fichier CSV généré avec succès'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        en: `Error generating CSV: ${error.message}`,
        fr: `Erreur lors de la génération CSV: ${error.message}`
      }
    };
  }
};

/**
 * Escape CSV field value
 * Échapper la valeur d'un champ CSV
 * 
 * @param {string} value - Field value
 * @returns {string} Escaped value
 */
const escapeCSV = (value) => {
  if (typeof value !== 'string') return value;
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Generate PDF file from geocoding results
 * Générer un fichier PDF à partir des résultats de géocodage
 * 
 * @param {Array} results - Geocoding results
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result with file path
 */
const generatePDF = (results, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const lang = options.language || 'en';
      const { pageSize, orientation, margins, fontSize, headerFontSize } = exportSettings.pdf;

      // Create PDF document
      const doc = new PDFDocument({
        size: pageSize,
        layout: orientation,
        margins
      });

      // Generate file
      const fileName = `geocoding_results_${Date.now()}.pdf`;
      const filePath = path.join(options.outputDir || './uploads', fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);

      // Title
      const title = lang === 'fr' 
        ? 'Résultats de Géocodage' 
        : 'Geocoding Results';
      
      doc.fontSize(headerFontSize + 4)
         .font('Helvetica-Bold')
         .text(title, { align: 'center' });
      
      doc.moveDown();

      // Filters used
      if (options.filters) {
        const filtersTitle = lang === 'fr' ? 'Filtres appliqués:' : 'Filters applied:';
        doc.fontSize(fontSize)
           .font('Helvetica-Bold')
           .text(filtersTitle);
        
        doc.font('Helvetica');
        if (options.filters.country) {
          doc.text(`${lang === 'fr' ? 'Pays' : 'Country'}: ${options.filters.country}`);
        }
        if (options.filters.region) {
          doc.text(`${lang === 'fr' ? 'Région' : 'Region'}: ${options.filters.region}`);
        }
        if (options.filters.department) {
          doc.text(`${lang === 'fr' ? 'Département' : 'Department'}: ${options.filters.department}`);
        }
        doc.moveDown();
      }

      // Date
      const dateLabel = lang === 'fr' ? 'Date d\'exportation' : 'Export Date';
      doc.fontSize(fontSize)
         .text(`${dateLabel}: ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}`);
      
      doc.moveDown();

      // Statistics
      const found = results.filter(r => r.found).length;
      const notFound = results.filter(r => !r.found).length;
      
      doc.font('Helvetica-Bold')
         .text(lang === 'fr' ? 'Statistiques:' : 'Statistics:');
      
      doc.font('Helvetica')
         .text(`${lang === 'fr' ? 'Total' : 'Total'}: ${results.length}`)
         .text(`${lang === 'fr' ? 'Trouvés' : 'Found'}: ${found}`)
         .text(`${lang === 'fr' ? 'Non trouvés' : 'Not Found'}: ${notFound}`)
         .text(`${lang === 'fr' ? 'Taux de réussite' : 'Success Rate'}: ${Math.round((found / results.length) * 100)}%`);
      
      doc.moveDown(2);

      // Table header
      const headers = lang === 'fr'
        ? ['Village', 'Lat', 'Lng', 'Source', 'Conf.', 'Trouvé']
        : ['Village', 'Lat', 'Lng', 'Source', 'Conf.', 'Found'];
      
      const colWidths = [150, 70, 70, 100, 50, 50];
      const tableTop = doc.y;
      let currentY = tableTop;

      // Draw header row
      doc.font('Helvetica-Bold').fontSize(fontSize);
      let xPos = margins.left;
      
      headers.forEach((header, i) => {
        doc.text(header, xPos, currentY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      currentY += 20;
      doc.moveTo(margins.left, currentY).lineTo(margins.left + colWidths.reduce((a, b) => a + b, 0), currentY).stroke();
      currentY += 10;

      // Draw data rows
      doc.font('Helvetica').fontSize(fontSize - 1);
      
      for (const result of results) {
        // Check if we need a new page
        if (currentY > doc.page.height - margins.bottom - 30) {
          doc.addPage();
          currentY = margins.top;
        }

        xPos = margins.left;
        const rowData = [
          truncateText(result.villageName || '', 25),
          result.latitude ? result.latitude.toFixed(4) : '-',
          result.longitude ? result.longitude.toFixed(4) : '-',
          truncateText(result.source || '-', 15),
          result.confidence ? `${Math.round(result.confidence * 100)}%` : '-',
          result.found ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No')
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, xPos, currentY, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        currentY += 15;
      }

      // Footer
      doc.fontSize(8)
         .text(
           lang === 'fr' 
             ? 'Généré par l\'Application de Géocodage' 
             : 'Generated by Geocoding Application',
           margins.left,
           doc.page.height - margins.bottom,
           { align: 'center' }
         );

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          success: true,
          filePath,
          fileName,
          format: 'pdf',
          message: {
            en: 'PDF file generated successfully',
            fr: 'Fichier PDF généré avec succès'
          }
        });
      });

      writeStream.on('error', (error) => {
        resolve({
          success: false,
          error: {
            en: `Error writing PDF: ${error.message}`,
            fr: `Erreur lors de l'écriture du PDF: ${error.message}`
          }
        });
      });

    } catch (error) {
      resolve({
        success: false,
        error: {
          en: `Error generating PDF: ${error.message}`,
          fr: `Erreur lors de la génération PDF: ${error.message}`
        }
      });
    }
  });
};

/**
 * Truncate text to specified length
 * Tronquer le texte à la longueur spécifiée
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Generate export in specified format
 * Générer l'exportation dans le format spécifié
 * 
 * @param {Array} results - Geocoding results
 * @param {string} format - Export format ('excel', 'csv', 'pdf')
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
const generateExport = async (results, format, options = {}) => {
  switch (format.toLowerCase()) {
    case 'excel':
    case 'xlsx':
      return generateExcel(results, options);
    case 'csv':
      return generateCSV(results, options);
    case 'pdf':
      return await generatePDF(results, options);
    default:
      return {
        success: false,
        error: {
          en: `Unsupported export format: ${format}`,
          fr: `Format d'exportation non supporté: ${format}`
        }
      };
  }
};

module.exports = {
  generateExcel,
  generateCSV,
  generatePDF,
  generateExport,
  escapeCSV,
  truncateText
};
