/**
 * Excel Parser Utility
 * Utilitaire d'Analyse Excel
 * 
 * Parse Excel (.xlsx, .xls) and CSV files, extract village names.
 * Analyser les fichiers Excel (.xlsx, .xls) et CSV, extraire les noms de villages.
 */

const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

/**
 * Parse Excel file and extract data
 * Analyser un fichier Excel et extraire les données
 * 
 * @param {string} filePath - Path to the Excel file
 * @param {Object} options - Parsing options
 * @returns {Object} Parsed data with headers and rows
 */
const parseExcelFile = (filePath, options = {}) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: options.hasHeaders !== false ? 1 : undefined,
      defval: '',
      raw: false
    });

    // Get headers
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? cell.v : `Column${col + 1}`);
    }

    return {
      success: true,
      sheetName,
      headers,
      rows: jsonData,
      totalRows: jsonData.length,
      availableSheets: workbook.SheetNames
    };
  } catch (error) {
    return {
      success: false,
      error: {
        en: `Error parsing Excel file: ${error.message}`,
        fr: `Erreur lors de l'analyse du fichier Excel: ${error.message}`
      }
    };
  }
};

/**
 * Parse CSV file and extract data
 * Analyser un fichier CSV et extraire les données
 * 
 * @param {string} filePath - Path to the CSV file
 * @param {Object} options - Parsing options
 * @returns {Promise<Object>} Parsed data with headers and rows
 */
const parseCSVFile = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let headers = [];

    fs.createReadStream(filePath)
      .pipe(csv({
        separator: options.delimiter || ',',
        headers: options.headers || undefined,
        skipLines: options.skipLines || 0
      }))
      .on('headers', (hdrs) => {
        headers = hdrs;
      })
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        resolve({
          success: true,
          headers,
          rows: results,
          totalRows: results.length
        });
      })
      .on('error', (error) => {
        resolve({
          success: false,
          error: {
            en: `Error parsing CSV file: ${error.message}`,
            fr: `Erreur lors de l'analyse du fichier CSV: ${error.message}`
          }
        });
      });
  });
};

/**
 * Auto-detect file type and parse accordingly
 * Détecter automatiquement le type de fichier et analyser en conséquence
 * 
 * @param {string} filePath - Path to the file
 * @param {Object} options - Parsing options
 * @returns {Promise<Object>} Parsed data
 */
const parseFile = async (filePath, options = {}) => {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.xlsx':
    case '.xls':
      return parseExcelFile(filePath, options);
    case '.csv':
    case '.txt':
      return await parseCSVFile(filePath, options);
    default:
      return {
        success: false,
        error: {
          en: `Unsupported file format: ${ext}`,
          fr: `Format de fichier non supporté: ${ext}`
        }
      };
  }
};

/**
 * Extract village names from parsed data
 * Extraire les noms de villages des données analysées
 * 
 * @param {Object} parsedData - Parsed file data
 * @param {string} columnName - Name of the column containing village names
 * @returns {Object} Extracted village names
 */
const extractVillageNames = (parsedData, columnName = null) => {
  if (!parsedData.success || !parsedData.rows || parsedData.rows.length === 0) {
    return {
      success: false,
      villages: [],
      error: {
        en: 'No data found in file',
        fr: 'Aucune donnée trouvée dans le fichier'
      }
    };
  }

  // If column name not specified, try to auto-detect
  let targetColumn = columnName;
  
  if (!targetColumn) {
    targetColumn = autoDetectVillageColumn(parsedData.headers);
  }

  if (!targetColumn) {
    return {
      success: false,
      villages: [],
      availableColumns: parsedData.headers,
      error: {
        en: 'Could not auto-detect village column. Please specify the column name.',
        fr: 'Impossible de détecter automatiquement la colonne des villages. Veuillez spécifier le nom de la colonne.'
      }
    };
  }

  // Extract village names
  const villages = parsedData.rows
    .map(row => row[targetColumn])
    .filter(name => name && name.toString().trim() !== '')
    .map(name => name.toString().trim());

  // Remove duplicates
  const uniqueVillages = [...new Set(villages)];

  return {
    success: true,
    villages: uniqueVillages,
    totalExtracted: uniqueVillages.length,
    duplicatesRemoved: villages.length - uniqueVillages.length,
    columnUsed: targetColumn,
    availableColumns: parsedData.headers
  };
};

/**
 * Auto-detect the column containing village names
 * Détecter automatiquement la colonne contenant les noms de villages
 * 
 * @param {Array} headers - Column headers
 * @returns {string|null} Detected column name or null
 */
const autoDetectVillageColumn = (headers) => {
  // Common column names for village/location data
  const villageKeywords = [
    'village', 'villages', 'nom_village', 'village_name', 'villagename',
    'locality', 'localité', 'localite', 'location', 'lieu',
    'place', 'place_name', 'placename', 'nom_lieu',
    'settlement', 'town', 'ville', 'city', 'commune',
    'name', 'nom', 'designation', 'désignation'
  ];

  const normalizedHeaders = headers.map(h => h.toString().toLowerCase().trim());

  // First, try exact matches
  for (const keyword of villageKeywords) {
    const index = normalizedHeaders.indexOf(keyword);
    if (index !== -1) {
      return headers[index];
    }
  }

  // Then, try partial matches
  for (const keyword of villageKeywords) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedHeaders[i].includes(keyword)) {
        return headers[i];
      }
    }
  }

  // If no match found, return the first column as fallback
  return headers.length > 0 ? headers[0] : null;
};

/**
 * Validate file before parsing
 * Valider le fichier avant l'analyse
 * 
 * @param {string} filePath - Path to the file
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateFile = (filePath, options = {}) => {
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
  const allowedExtensions = options.allowedExtensions || ['.xlsx', '.xls', '.csv', '.txt'];

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      error: {
        en: 'File not found',
        fr: 'Fichier non trouvé'
      }
    };
  }

  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: {
        en: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`,
        fr: `Type de fichier invalide. Autorisés: ${allowedExtensions.join(', ')}`
      }
    };
  }

  // Check file size
  const stats = fs.statSync(filePath);
  if (stats.size > maxSize) {
    return {
      valid: false,
      error: {
        en: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
        fr: `Fichier trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)}Mo`
      }
    };
  }

  return {
    valid: true,
    fileInfo: {
      name: path.basename(filePath),
      extension: ext,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size)
    }
  };
};

/**
 * Format file size for display
 * Formater la taille du fichier pour l'affichage
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file preview (first N rows)
 * Obtenir un aperçu du fichier (N premières lignes)
 * 
 * @param {string} filePath - Path to the file
 * @param {number} numRows - Number of rows to preview
 * @returns {Promise<Object>} File preview
 */
const getFilePreview = async (filePath, numRows = 5) => {
  const parsed = await parseFile(filePath);
  
  if (!parsed.success) {
    return parsed;
  }

  return {
    success: true,
    headers: parsed.headers,
    preview: parsed.rows.slice(0, numRows),
    totalRows: parsed.totalRows,
    availableSheets: parsed.availableSheets
  };
};

module.exports = {
  parseExcelFile,
  parseCSVFile,
  parseFile,
  extractVillageNames,
  autoDetectVillageColumn,
  validateFile,
  formatFileSize,
  getFilePreview
};
