/**
 * Main JavaScript for Village Geocoding Application
 */

// State management
const state = {
  uploadedFile: null,
  fileId: null,
  villages: [],
  results: [],
  isProcessing: false,
  cancelRequested: false
};

// DOM Elements
const elements = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // File Upload
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  fileInfo: document.getElementById('fileInfo'),
  fileName: document.getElementById('fileName'),
  rowCount: document.getElementById('rowCount'),
  villageCount: document.getElementById('villageCount'),
  villageColumn: document.getElementById('villageColumn'),
  removeFile: document.getElementById('removeFile'),
  
  // Manual Entry
  manualInput: document.getElementById('manualInput'),
  manualCount: document.getElementById('manualCount'),
  
  // Filters
  countryFilter: document.getElementById('countryFilter'),
  countryCodeFilter: document.getElementById('countryCodeFilter'),
  regionFilter: document.getElementById('regionFilter'),
  departmentFilter: document.getElementById('departmentFilter'),
  districtFilter: document.getElementById('districtFilter'),
  sourceFilter: document.getElementById('sourceFilter'),
  
  // Actions
  geocodeBtn: document.getElementById('geocodeBtn'),
  
  // Progress
  progressSection: document.getElementById('progressSection'),
  progressFill: document.getElementById('progressFill'),
  progressPercent: document.getElementById('progressPercent'),
  processedCount: document.getElementById('processedCount'),
  totalCount: document.getElementById('totalCount'),
  cancelBtn: document.getElementById('cancelBtn'),
  
  // Results
  resultsSection: document.getElementById('resultsSection'),
  successCount: document.getElementById('successCount'),
  failedCount: document.getElementById('failedCount'),
  resultsBody: document.getElementById('resultsBody'),
  
  // Export
  exportCSV: document.getElementById('exportCSV'),
  exportExcel: document.getElementById('exportExcel'),
  exportPDF: document.getElementById('exportPDF'),
  exportGeoJSON: document.getElementById('exportGeoJSON')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  setupTabs();
  setupFileUpload();
  setupManualEntry();
  setupGeocoding();
  setupExport();
}

// ===== Tab Navigation =====
function setupTabs() {
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update active states
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// ===== File Upload =====
function setupFileUpload() {
  // Click to upload
  elements.dropZone.addEventListener('click', () => {
    elements.fileInput.click();
  });
  
  // File input change
  elements.fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop
  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
  });
  
  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
  });
  
  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
  
  // Remove file
  elements.removeFile.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  // Validate file type
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!CONFIG.SUPPORTED_FILE_TYPES.includes(ext)) {
    showToast('Invalid file type. Please upload CSV or Excel files.', 'error');
    return;
  }
  
  // Validate file size
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showToast('File too large. Maximum size is 10MB.', 'error');
    return;
  }
  
  try {
    showToast('Uploading file...', 'info');
    
    const result = await API.uploadFile(file);
    
    if (result.success) {
      state.uploadedFile = file;
      state.fileId = result.fileId;
      state.villages = result.villages;
      
      // Update UI
      elements.fileName.textContent = result.fileName;
      elements.rowCount.textContent = result.totalRows;
      elements.villageCount.textContent = result.villageCount;
      
      // Populate column dropdown
      elements.villageColumn.innerHTML = '';
      result.columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        if (col === result.detectedVillageColumn) {
          option.selected = true;
        }
        elements.villageColumn.appendChild(option);
      });
      
      elements.fileInfo.classList.remove('hidden');
      showToast('File uploaded successfully!', 'success');
    }
  } catch (error) {
    showToast('Failed to upload file: ' + error.message, 'error');
  }
}

function clearFile() {
  if (state.fileId) {
    API.deleteFile(state.fileId).catch(console.error);
  }
  
  state.uploadedFile = null;
  state.fileId = null;
  state.villages = [];
  
  elements.fileInput.value = '';
  elements.fileInfo.classList.add('hidden');
}

// ===== Manual Entry =====
function setupManualEntry() {
  elements.manualInput.addEventListener('input', () => {
    const lines = elements.manualInput.value
      .split('\n')
      .filter(line => line.trim().length > 0);
    elements.manualCount.textContent = lines.length;
  });
}

// ===== Geocoding =====
function setupGeocoding() {
  elements.geocodeBtn.addEventListener('click', startGeocoding);
  elements.cancelBtn.addEventListener('click', cancelGeocoding);
}

async function startGeocoding() {
  // Get villages to geocode
  let villages = [];
  
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  
  if (activeTab === 'file-upload') {
    if (!state.fileId) {
      showToast('Please upload a file first.', 'warning');
      return;
    }
    
    try {
      const result = await API.processFile(
        state.fileId,
        elements.villageColumn.value,
        getFilters()
      );
      villages = result.villages.map(v => v.name);
    } catch (error) {
      showToast('Failed to process file: ' + error.message, 'error');
      return;
    }
  } else {
    villages = elements.manualInput.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (villages.length === 0) {
      showToast('Please enter at least one village name.', 'warning');
      return;
    }
  }
  
  // Start geocoding
  state.isProcessing = true;
  state.cancelRequested = false;
  state.results = [];
  
  // Show progress
  elements.progressSection.classList.remove('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.geocodeBtn.disabled = true;
  
  elements.totalCount.textContent = villages.length;
  elements.processedCount.textContent = '0';
  elements.progressFill.style.width = '0%';
  elements.progressPercent.textContent = '0%';
  
  const filters = getFilters();
  const source = elements.sourceFilter.value;
  
  // Process villages one by one (due to rate limiting)
  for (let i = 0; i < villages.length; i++) {
    if (state.cancelRequested) {
      break;
    }
    
    try {
      const result = await API.geocodeSingle(villages[i], filters, source);
      state.results.push({
        query: villages[i],
        ...result
      });
    } catch (error) {
      state.results.push({
        query: villages[i],
        success: false,
        message: error.message
      });
    }
    
    // Update progress
    const progress = Math.round(((i + 1) / villages.length) * 100);
    elements.processedCount.textContent = i + 1;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressPercent.textContent = `${progress}%`;
    
    // Rate limiting delay
    if (i < villages.length - 1 && !state.cancelRequested) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
    }
  }
  
  // Geocoding complete
  state.isProcessing = false;
  elements.progressSection.classList.add('hidden');
  elements.geocodeBtn.disabled = false;
  
  displayResults();
}

function cancelGeocoding() {
  state.cancelRequested = true;
  showToast('Cancelling geocoding...', 'warning');
}

function getFilters() {
  return {
    country: elements.countryFilter.value.trim() || undefined,
    countryCode: elements.countryCodeFilter.value.trim().toUpperCase() || undefined,
    region: elements.regionFilter.value.trim() || undefined,
    department: elements.departmentFilter.value.trim() || undefined,
    district: elements.districtFilter.value.trim() || undefined
  };
}

function displayResults() {
  const successResults = state.results.filter(r => r.success);
  const failedResults = state.results.filter(r => !r.success);
  
  elements.successCount.textContent = successResults.length;
  elements.failedCount.textContent = failedResults.length;
  
  // Build table
  elements.resultsBody.innerHTML = '';
  
  state.results.forEach((result, index) => {
    const row = document.createElement('tr');
    
    const lat = result.data?.latitude || '';
    const lon = result.data?.longitude || '';
    const displayName = result.data?.displayName || result.message || 'Not found';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(result.query)}</strong></td>
      <td>
        <span class="status-badge ${result.success ? 'success' : 'failed'}">
          <i class="fas fa-${result.success ? 'check' : 'times'}"></i>
          ${result.success ? 'Found' : 'Not Found'}
        </span>
      </td>
      <td>${lat}</td>
      <td>${lon}</td>
      <td class="location-details">${escapeHtml(displayName)}</td>
      <td>
        ${result.success ? `
          <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15" 
             target="_blank" 
             class="btn btn-icon" 
             title="View on Map">
            <i class="fas fa-map"></i>
          </a>
        ` : ''}
      </td>
    `;
    
    elements.resultsBody.appendChild(row);
  });
  
  elements.resultsSection.classList.remove('hidden');
  
  // Scroll to results
  elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
  
  showToast(`Geocoding complete! ${successResults.length} found, ${failedResults.length} not found.`, 
    failedResults.length === 0 ? 'success' : 'warning');
}

// ===== Export =====
function setupExport() {
  elements.exportCSV.addEventListener('click', async () => {
    try {
      showToast('Generating CSV...', 'info');
      const blob = await API.exportCSV(state.results);
      downloadBlob(blob, 'geocoding_results.csv');
      showToast('CSV downloaded!', 'success');
    } catch (error) {
      showToast('Export failed: ' + error.message, 'error');
    }
  });
  
  elements.exportExcel.addEventListener('click', async () => {
    try {
      showToast('Generating Excel file...', 'info');
      const blob = await API.exportExcel(state.results);
      downloadBlob(blob, 'geocoding_results.xlsx');
      showToast('Excel file downloaded!', 'success');
    } catch (error) {
      showToast('Export failed: ' + error.message, 'error');
    }
  });
  
  elements.exportPDF.addEventListener('click', async () => {
    try {
      showToast('Generating PDF...', 'info');
      const blob = await API.exportPDF(state.results);
      downloadBlob(blob, 'geocoding_results.pdf');
      showToast('PDF downloaded!', 'success');
    } catch (error) {
      showToast('Export failed: ' + error.message, 'error');
    }
  });
  
  elements.exportGeoJSON.addEventListener('click', async () => {
    try {
      showToast('Generating GeoJSON...', 'info');
      const blob = await API.exportGeoJSON(state.results);
      downloadBlob(blob, 'geocoding_results.geojson');
      showToast('GeoJSON downloaded!', 'success');
    } catch (error) {
      showToast('Export failed: ' + error.message, 'error');
    }
  });
}

// ===== Utilities =====
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
