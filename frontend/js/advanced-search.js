/**
 * Advanced Search Page JavaScript
 * Handles map integration and proximity search
 */

// State
const searchState = {
  map: null,
  centerMarker: null,
  radiusCircle: null,
  resultMarkers: [],
  results: [],
  selectedRadius: 10
};

// DOM Elements
const searchElements = {
  centerLat: document.getElementById('centerLat'),
  centerLon: document.getElementById('centerLon'),
  radiusOptions: document.querySelectorAll('input[name="radius"]'),
  searchQuery: document.getElementById('searchQuery'),
  proximitySearchBtn: document.getElementById('proximitySearchBtn'),
  reverseGeocodeBtn: document.getElementById('reverseGeocodeBtn'),
  quickSearchInput: document.getElementById('quickSearchInput'),
  quickSearchBtn: document.getElementById('quickSearchBtn'),
  clearMapBtn: document.getElementById('clearMapBtn'),
  locateMeBtn: document.getElementById('locateMeBtn'),
  resultCount: document.getElementById('resultCount'),
  searchResultsList: document.getElementById('searchResultsList'),
  exportButtons: document.getElementById('exportButtons'),
  exportSearchCSV: document.getElementById('exportSearchCSV'),
  exportSearchExcel: document.getElementById('exportSearchExcel'),
  exportSearchPDF: document.getElementById('exportSearchPDF'),
  locationModal: document.getElementById('locationModal'),
  locationDetails: document.getElementById('locationDetails'),
  closeModal: document.getElementById('closeModal')
};

// Initialize
document.addEventListener('DOMContentLoaded', initAdvancedSearch);

function initAdvancedSearch() {
  initMap();
  setupEventListeners();
}

// ===== Map Initialization =====
function initMap() {
  // Create map centered on default location
  searchState.map = L.map('map').setView(
    [CONFIG.DEFAULT_MAP_CENTER.lat, CONFIG.DEFAULT_MAP_CENTER.lng],
    CONFIG.DEFAULT_MAP_ZOOM
  );
  
  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(searchState.map);
  
  // Handle map clicks
  searchState.map.on('click', handleMapClick);
}

function handleMapClick(e) {
  const { lat, lng } = e.latlng;
  
  // Update input fields
  searchElements.centerLat.value = lat.toFixed(6);
  searchElements.centerLon.value = lng.toFixed(6);
  
  // Update marker
  updateCenterMarker(lat, lng);
}

function updateCenterMarker(lat, lng) {
  // Remove existing marker
  if (searchState.centerMarker) {
    searchState.map.removeLayer(searchState.centerMarker);
  }
  
  // Remove existing circle
  if (searchState.radiusCircle) {
    searchState.map.removeLayer(searchState.radiusCircle);
  }
  
  // Create custom icon
  const centerIcon = L.divIcon({
    className: 'center-marker',
    html: '<i class="fas fa-crosshairs" style="color: #2563eb; font-size: 24px;"></i>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  
  // Add marker
  searchState.centerMarker = L.marker([lat, lng], { icon: centerIcon })
    .addTo(searchState.map)
    .bindPopup(`<strong>Search Center</strong><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`);
  
  // Add radius circle
  const radius = searchState.selectedRadius * 1000; // Convert km to meters
  searchState.radiusCircle = L.circle([lat, lng], {
    radius: radius,
    color: '#2563eb',
    fillColor: '#2563eb',
    fillOpacity: 0.1,
    weight: 2
  }).addTo(searchState.map);
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Radius selection
  searchElements.radiusOptions.forEach(radio => {
    radio.addEventListener('change', (e) => {
      searchState.selectedRadius = parseInt(e.target.value);
      
      // Update circle if marker exists
      if (searchState.centerMarker) {
        const lat = parseFloat(searchElements.centerLat.value);
        const lng = parseFloat(searchElements.centerLon.value);
        updateCenterMarker(lat, lng);
      }
    });
  });
  
  // Coordinate inputs
  searchElements.centerLat.addEventListener('change', updateMarkerFromInputs);
  searchElements.centerLon.addEventListener('change', updateMarkerFromInputs);
  
  // Proximity search
  searchElements.proximitySearchBtn.addEventListener('click', performProximitySearch);
  
  // Reverse geocode
  searchElements.reverseGeocodeBtn.addEventListener('click', performReverseGeocode);
  
  // Quick search
  searchElements.quickSearchBtn.addEventListener('click', performQuickSearch);
  searchElements.quickSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performQuickSearch();
    }
  });
  
  // Map controls
  searchElements.clearMapBtn.addEventListener('click', clearMap);
  searchElements.locateMeBtn.addEventListener('click', locateUser);
  
  // Modal
  searchElements.closeModal.addEventListener('click', closeModal);
  searchElements.locationModal.addEventListener('click', (e) => {
    if (e.target === searchElements.locationModal) {
      closeModal();
    }
  });
  
  // Export buttons
  searchElements.exportSearchCSV.addEventListener('click', () => exportResults('csv'));
  searchElements.exportSearchExcel.addEventListener('click', () => exportResults('excel'));
  searchElements.exportSearchPDF.addEventListener('click', () => exportResults('pdf'));
}

function updateMarkerFromInputs() {
  const lat = parseFloat(searchElements.centerLat.value);
  const lng = parseFloat(searchElements.centerLon.value);
  
  if (!isNaN(lat) && !isNaN(lng)) {
    updateCenterMarker(lat, lng);
    searchState.map.setView([lat, lng], 12);
  }
}

// ===== Search Functions =====
async function performProximitySearch() {
  const lat = parseFloat(searchElements.centerLat.value);
  const lng = parseFloat(searchElements.centerLon.value);
  
  if (isNaN(lat) || isNaN(lng)) {
    showToast('Please set a center point by clicking on the map.', 'warning');
    return;
  }
  
  try {
    showToast('Searching for villages...', 'info');
    searchElements.proximitySearchBtn.disabled = true;
    
    const result = await API.proximitySearch(
      lat,
      lng,
      searchState.selectedRadius,
      searchElements.searchQuery.value.trim()
    );
    
    if (result.success) {
      searchState.results = result.data;
      displaySearchResults(result.data);
      addResultMarkersToMap(result.data);
      showToast(`Found ${result.data.length} locations!`, 'success');
    } else {
      showToast(result.message || 'Search failed', 'error');
    }
  } catch (error) {
    showToast('Search failed: ' + error.message, 'error');
  } finally {
    searchElements.proximitySearchBtn.disabled = false;
  }
}

async function performReverseGeocode() {
  const lat = parseFloat(searchElements.centerLat.value);
  const lng = parseFloat(searchElements.centerLon.value);
  
  if (isNaN(lat) || isNaN(lng)) {
    showToast('Please set a point by clicking on the map.', 'warning');
    return;
  }
  
  try {
    showToast('Getting location info...', 'info');
    searchElements.reverseGeocodeBtn.disabled = true;
    
    const result = await API.reverseGeocode(lat, lng);
    
    if (result.success) {
      showLocationModal(result.data);
    } else {
      showToast(result.message || 'Could not get location info', 'error');
    }
  } catch (error) {
    showToast('Failed: ' + error.message, 'error');
  } finally {
    searchElements.reverseGeocodeBtn.disabled = false;
  }
}

async function performQuickSearch() {
  const query = searchElements.quickSearchInput.value.trim();
  
  if (!query) {
    showToast('Please enter a village name.', 'warning');
    return;
  }
  
  try {
    showToast('Searching...', 'info');
    searchElements.quickSearchBtn.disabled = true;
    
    const result = await API.geocodeSingle(query);
    
    if (result.success) {
      const { latitude, longitude } = result.data;
      
      // Update map
      searchElements.centerLat.value = latitude.toFixed(6);
      searchElements.centerLon.value = longitude.toFixed(6);
      updateCenterMarker(latitude, longitude);
      searchState.map.setView([latitude, longitude], 14);
      
      // Show details
      showLocationModal(result.data);
      showToast('Location found!', 'success');
    } else {
      showToast(result.message || 'Village not found', 'warning');
    }
  } catch (error) {
    showToast('Search failed: ' + error.message, 'error');
  } finally {
    searchElements.quickSearchBtn.disabled = false;
  }
}

// ===== Display Functions =====
function displaySearchResults(results) {
  searchElements.resultCount.textContent = `${results.length} villages found`;
  
  if (results.length === 0) {
    searchElements.searchResultsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No villages found in this area</p>
      </div>
    `;
    searchElements.exportButtons.style.display = 'none';
    return;
  }
  
  searchElements.exportButtons.style.display = 'flex';
  
  searchElements.searchResultsList.innerHTML = results.map((result, index) => `
    <div class="result-item" data-index="${index}">
      <div class="result-info">
        <h4>${escapeHtml(result.displayName?.split(',')[0] || 'Unknown')}</h4>
        <p>${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}</p>
      </div>
      <div class="result-distance">
        ${result.distance ? result.distance + ' km' : ''}
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      const result = results[index];
      
      // Center map on result
      searchState.map.setView([result.latitude, result.longitude], 14);
      
      // Open popup
      searchState.resultMarkers[index]?.openPopup();
    });
  });
}

function addResultMarkersToMap(results) {
  // Clear existing markers
  searchState.resultMarkers.forEach(marker => {
    searchState.map.removeLayer(marker);
  });
  searchState.resultMarkers = [];
  
  // Add new markers
  results.forEach((result, index) => {
    const marker = L.marker([result.latitude, result.longitude])
      .addTo(searchState.map)
      .bindPopup(`
        <strong>${escapeHtml(result.displayName?.split(',')[0] || 'Unknown')}</strong><br>
        <small>${escapeHtml(result.displayName || '')}</small><br>
        <em>Distance: ${result.distance || 'N/A'} km</em>
      `);
    
    searchState.resultMarkers.push(marker);
  });
  
  // Fit bounds to show all markers
  if (results.length > 0 && searchState.centerMarker) {
    const group = L.featureGroup([
      searchState.centerMarker,
      ...searchState.resultMarkers
    ]);
    searchState.map.fitBounds(group.getBounds().pad(0.1));
  }
}

function showLocationModal(data) {
  const address = data.address || {};
  
  searchElements.locationDetails.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Name:</span>
      <span class="detail-value">${escapeHtml(data.displayName?.split(',')[0] || 'Unknown')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Full Address:</span>
      <span class="detail-value">${escapeHtml(data.displayName || 'N/A')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Latitude:</span>
      <span class="detail-value">${data.latitude}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Longitude:</span>
      <span class="detail-value">${data.longitude}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Type:</span>
      <span class="detail-value">${escapeHtml(data.type || 'N/A')}</span>
    </div>
    ${address.village ? `
    <div class="detail-row">
      <span class="detail-label">Village:</span>
      <span class="detail-value">${escapeHtml(address.village)}</span>
    </div>
    ` : ''}
    ${address.county ? `
    <div class="detail-row">
      <span class="detail-label">County:</span>
      <span class="detail-value">${escapeHtml(address.county)}</span>
    </div>
    ` : ''}
    ${address.state ? `
    <div class="detail-row">
      <span class="detail-label">State/Region:</span>
      <span class="detail-value">${escapeHtml(address.state)}</span>
    </div>
    ` : ''}
    ${address.country ? `
    <div class="detail-row">
      <span class="detail-label">Country:</span>
      <span class="detail-value">${escapeHtml(address.country)}</span>
    </div>
    ` : ''}
  `;
  
  searchElements.locationModal.classList.remove('hidden');
}

function closeModal() {
  searchElements.locationModal.classList.add('hidden');
}

// ===== Map Controls =====
function clearMap() {
  // Clear markers
  if (searchState.centerMarker) {
    searchState.map.removeLayer(searchState.centerMarker);
    searchState.centerMarker = null;
  }
  
  if (searchState.radiusCircle) {
    searchState.map.removeLayer(searchState.radiusCircle);
    searchState.radiusCircle = null;
  }
  
  searchState.resultMarkers.forEach(marker => {
    searchState.map.removeLayer(marker);
  });
  searchState.resultMarkers = [];
  
  // Clear inputs
  searchElements.centerLat.value = '';
  searchElements.centerLon.value = '';
  
  // Clear results
  searchState.results = [];
  searchElements.resultCount.textContent = '0 villages found';
  searchElements.searchResultsList.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-map-marked-alt"></i>
      <p>Click on the map and search to find villages</p>
    </div>
  `;
  searchElements.exportButtons.style.display = 'none';
  
  // Reset view
  searchState.map.setView(
    [CONFIG.DEFAULT_MAP_CENTER.lat, CONFIG.DEFAULT_MAP_CENTER.lng],
    CONFIG.DEFAULT_MAP_ZOOM
  );
  
  showToast('Map cleared', 'info');
}

function locateUser() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }
  
  showToast('Getting your location...', 'info');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      searchElements.centerLat.value = latitude.toFixed(6);
      searchElements.centerLon.value = longitude.toFixed(6);
      
      updateCenterMarker(latitude, longitude);
      searchState.map.setView([latitude, longitude], 12);
      
      showToast('Location found!', 'success');
    },
    (error) => {
      showToast('Could not get your location: ' + error.message, 'error');
    }
  );
}

// ===== Export =====
async function exportResults(format) {
  if (searchState.results.length === 0) {
    showToast('No results to export.', 'warning');
    return;
  }
  
  try {
    showToast(`Generating ${format.toUpperCase()}...`, 'info');
    
    let blob;
    let filename;
    
    switch (format) {
      case 'csv':
        blob = await API.exportCSV(searchState.results, 'proximity_search_results');
        filename = 'proximity_search_results.csv';
        break;
      case 'excel':
        blob = await API.exportExcel(searchState.results, 'proximity_search_results');
        filename = 'proximity_search_results.xlsx';
        break;
      case 'pdf':
        blob = await API.exportPDF(searchState.results, 'proximity_search_results', 'Proximity Search Results');
        filename = 'proximity_search_results.pdf';
        break;
    }
    
    downloadBlob(blob, filename);
    showToast(`${format.toUpperCase()} downloaded!`, 'success');
  } catch (error) {
    showToast('Export failed: ' + error.message, 'error');
  }
}

// ===== Utilities =====
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
