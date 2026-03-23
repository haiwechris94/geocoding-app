const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const csv = require('csv-parser');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Parse CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Parsed data
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Parse Excel file
 * @param {string} filePath - Path to Excel file
 * @returns {Array} Parsed data
 */
function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  return xlsx.utils.sheet_to_json(worksheet);
}

/**
 * Detect village name column from data
 * @param {Array} data - Parsed data
 * @returns {string|null} Column name containing village names
 */
function detectVillageColumn(data) {
  if (!data || data.length === 0) return null;
  
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  
  // Common column names for village/location
  const villagePatterns = [
    /^village$/i,
    /^village.?name$/i,
    /^name$/i,
    /^location$/i,
    /^place$/i,
    /^town$/i,
    /^city$/i,
    /^locality$/i,
    /^settlement$/i
  ];
  
  for (const pattern of villagePatterns) {
    const match = columns.find(col => pattern.test(col));
    if (match) return match;
  }
  
  // Return first column as fallback
  return columns[0];
}

/**
 * POST /api/upload/file
 * Upload and parse CSV/Excel file
 */
router.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No file uploaded'
      });
    }
    
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    let data;
    
    try {
      if (ext === '.csv' || ext === '.txt') {
        data = await parseCSV(filePath);
      } else if (ext === '.xlsx' || ext === '.xls') {
        data = parseExcel(filePath);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (parseError) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      throw parseError;
    }
    
    if (!data || data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: true,
        message: 'File is empty or could not be parsed'
      });
    }
    
    // Detect columns
    const columns = Object.keys(data[0]);
    const villageColumn = detectVillageColumn(data);
    
    // Extract village names
    const villages = data
      .map(row => row[villageColumn])
      .filter(name => name && name.toString().trim().length > 0)
      .map(name => name.toString().trim());
    
    // Store file info for later processing
    const fileId = path.basename(filePath, ext);
    
    res.json({
      success: true,
      fileId,
      fileName: req.file.originalname,
      totalRows: data.length,
      columns,
      detectedVillageColumn: villageColumn,
      villageCount: villages.length,
      preview: data.slice(0, 5),
      villages: villages.slice(0, 10) // Preview first 10 villages
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/upload/process
 * Process uploaded file for geocoding
 */
router.post('/process', async (req, res, next) => {
  try {
    const { fileId, villageColumn, filters = {} } = req.body;
    
    if (!fileId) {
      return res.status(400).json({
        error: true,
        message: 'File ID is required'
      });
    }
    
    // Find the uploaded file
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(uploadsDir);
    const matchingFile = files.find(f => f.startsWith(fileId));
    
    if (!matchingFile) {
      return res.status(404).json({
        error: true,
        message: 'File not found. It may have been deleted.'
      });
    }
    
    const filePath = path.join(uploadsDir, matchingFile);
    const ext = path.extname(matchingFile).toLowerCase();
    
    let data;
    
    if (ext === '.csv' || ext === '.txt') {
      data = await parseCSV(filePath);
    } else {
      data = parseExcel(filePath);
    }
    
    // Use specified column or detect
    const column = villageColumn || detectVillageColumn(data);
    
    // Extract villages with row indices
    const villages = data
      .map((row, index) => ({
        rowIndex: index + 1,
        name: row[column] ? row[column].toString().trim() : null,
        originalData: row
      }))
      .filter(v => v.name && v.name.length > 0);
    
    res.json({
      success: true,
      fileId,
      villageColumn: column,
      totalVillages: villages.length,
      villages,
      filters
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/upload/:fileId
 * Delete uploaded file
 */
router.delete('/:fileId', (req, res, next) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(uploadsDir);
    const matchingFile = files.find(f => f.startsWith(fileId));
    
    if (matchingFile) {
      fs.unlinkSync(path.join(uploadsDir, matchingFile));
    }
    
    res.json({
      success: true,
      message: 'File deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
