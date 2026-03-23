/**
 * API Service for Village Geocoding Application
 */
const API = {
  /**
   * Make a fetch request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(url, mergedOptions);
      
      // Handle file downloads
      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  /**
   * Geocode a single village
   */
  async geocodeSingle(villageName, filters = {}, source = 'nominatim') {
    return this.request('/geocode/single', {
      method: 'POST',
      body: JSON.stringify({ villageName, filters, source })
    });
  },
  
  /**
   * Geocode multiple villages
   */
  async geocodeBatch(villages, filters = {}, source = 'nominatim') {
    return this.request('/geocode/batch', {
      method: 'POST',
      body: JSON.stringify({ villages, filters, source })
    });
  },
  
  /**
   * Reverse geocode coordinates
   */
  async reverseGeocode(latitude, longitude, source = 'nominatim') {
    return this.request('/geocode/reverse', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, source })
    });
  },
  
  /**
   * Get available geocoding sources
   */
  async getSources() {
    return this.request('/geocode/sources');
  },
  
  /**
   * Upload a file for processing
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/upload/file', {
      method: 'POST',
      headers: {}, // Let browser set content-type for FormData
      body: formData
    });
  },
  
  /**
   * Process uploaded file
   */
  async processFile(fileId, villageColumn, filters = {}) {
    return this.request('/upload/process', {
      method: 'POST',
      body: JSON.stringify({ fileId, villageColumn, filters })
    });
  },
  
  /**
   * Delete uploaded file
   */
  async deleteFile(fileId) {
    return this.request(`/upload/${fileId}`, {
      method: 'DELETE'
    });
  },
  
  /**
   * Search for villages within a radius
   */
  async proximitySearch(latitude, longitude, radius, query = '') {
    return this.request('/search/proximity', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, radius, query })
    });
  },
  
  /**
   * Find nearest villages
   */
  async findNearest(latitude, longitude, limit = 10) {
    return this.request('/search/nearest', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, limit })
    });
  },
  
  /**
   * Search within bounds
   */
  async searchInBounds(bounds, query = '') {
    return this.request('/search/bounds', {
      method: 'POST',
      body: JSON.stringify({ ...bounds, query })
    });
  },
  
  /**
   * Calculate distance between two points
   */
  async calculateDistance(lat1, lon1, lat2, lon2) {
    return this.request(`/search/distance?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}`);
  },
  
  /**
   * Export results to CSV
   */
  async exportCSV(data, filename = 'geocoding_results') {
    const response = await fetch(`${CONFIG.API_BASE_URL}/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, filename })
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  },
  
  /**
   * Export results to Excel
   */
  async exportExcel(data, filename = 'geocoding_results') {
    const response = await fetch(`${CONFIG.API_BASE_URL}/export/excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, filename })
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  },
  
  /**
   * Export results to PDF
   */
  async exportPDF(data, filename = 'geocoding_results', title = 'Village Geocoding Results') {
    const response = await fetch(`${CONFIG.API_BASE_URL}/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, filename, title })
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  },
  
  /**
   * Export results to GeoJSON
   */
  async exportGeoJSON(data, filename = 'geocoding_results') {
    const response = await fetch(`${CONFIG.API_BASE_URL}/export/geojson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, filename })
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  }
};

/**
 * Download a blob as a file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, CONFIG.TOAST_DURATION);
}
