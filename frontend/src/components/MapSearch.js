import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';
import './MapSearch.css';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const centerIcon = createIcon('red');
const resultIcon = createIcon('blue');
const lowConfidenceIcon = createIcon('orange');
const suggestionIcon = createIcon('violet');
const aiIcon = createIcon('gold');

// Map click handler component
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    }
  });
  return null;
};

const MapSearch = ({ 
  center, 
  onCenterChange, 
  radius, 
  onRadiusChange, 
  results,
  suggestionMarkers = [],
  aiBestResult = null,
  onSearch,
  villageName,
  onVillageNameChange
}) => {
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [description, setDescription] = useState('');
  
  const radiusOptions = [10, 20, 30, 50, 100];
  
  // Default center (Africa)
  const defaultCenter = [4.0, 20.0];
  const mapCenter = center ? [center.lat, center.lng] : defaultCenter;

  const handleMapClick = (latlng) => {
    onCenterChange({ lat: latlng.lat, lng: latlng.lng });
  };

  const handleSearch = () => {
    if (villageName && villageName.trim()) {
      onSearch({
        villageName: villageName.trim(),
        center,
        radius,
        description
      });
    }
  };

  const handleClear = () => {
    onCenterChange(null);
    onVillageNameChange('');
    setDescription('');
  };

  return (
    <div className="map-search">
      <div className="map-search-sidebar">
        <div className="search-form">
          <p className="search-instructions">{t('search.instructions')}</p>
          
          {/* Village Name Input */}
          <div className="form-group">
            <label className="form-label">{t('search.villageName')}</label>
            <input
              type="text"
              className="form-input"
              value={villageName}
              onChange={(e) => onVillageNameChange(e.target.value)}
              placeholder={t('search.villageNamePlaceholder')}
            />
          </div>

          {/* Radius Selection */}
          <div className="form-group">
            <label className="form-label">{t('search.radius')}</label>
            <div className="radius-options">
              {radiusOptions.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`radius-btn ${radius === r ? 'active' : ''}`}
                  onClick={() => onRadiusChange(r)}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{t('search.description')}</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('search.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Center Info */}
          {center && (
            <div className="center-info">
              <span className="center-label">{t('search.centerSet')}:</span>
              <span className="center-coords">
                {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="search-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={!villageName || !villageName.trim()}
            >
              {t('search.searchButton')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
            >
              {t('search.clearMap')}
            </button>
          </div>
        </div>

        {/* Results List */}
        {results && results.length > 0 && (
          <div className="search-results-list">
            <h4>{t('results.title')} ({results.length})</h4>
            <ul>
              {results.map((result, index) => (
                <li key={index} className="result-item">
                  <span className="result-name">{result.villageName}</span>
                  {result.found && (
                    <span className="result-distance">{result.distance} km</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={center ? 10 : 4}
          ref={mapRef}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Center Marker */}
          {center && (
            <>
              <Marker position={[center.lat, center.lng]} icon={centerIcon}>
                <Popup>
                  <strong>{t('search.centerSet')}</strong><br />
                  Lat: {center.lat.toFixed(4)}<br />
                  Lng: {center.lng.toFixed(4)}
                </Popup>
              </Marker>
              
              {/* Search Radius Circle */}
              <Circle
                center={[center.lat, center.lng]}
                radius={radius * 1000}
                pathOptions={{
                  color: '#2196F3',
                  fillColor: '#2196F3',
                  fillOpacity: 0.1
                }}
              />
            </>
          )}

          {/* Suggestion Markers */}
          {suggestionMarkers.map((s, i) => (
            s.latitude && s.longitude && (
              <Marker
                key={`suggestion-${i}`}
                position={[s.latitude, s.longitude]}
                icon={suggestionIcon}
              >
                <Popup>
                  <strong>🔍 {s.name}</strong><br />
                  Lat: {Number(s.latitude).toFixed(4)}<br />
                  Lng: {Number(s.longitude).toFixed(4)}<br />
                  {s.distance !== undefined && <>Distance: {s.distance} km<br /></>}
                  {s.source && <>Source: {s.source}</>}
                </Popup>
              </Marker>
            )
          ))}

          {/* AI Best Result Marker */}
          {aiBestResult && aiBestResult.latitude && aiBestResult.longitude && (
            <Marker
              position={[aiBestResult.latitude, aiBestResult.longitude]}
              icon={aiIcon}
            >
              <Popup>
                <strong>🤖 {aiBestResult.villageName || aiBestResult.name}</strong><br />
                Lat: {Number(aiBestResult.latitude).toFixed(4)}<br />
                Lng: {Number(aiBestResult.longitude).toFixed(4)}<br />
                {aiBestResult.source && <>Source: {aiBestResult.source}<br /></>}
                {aiBestResult.reliability && <>Fiabilité: {aiBestResult.reliability}</>}
              </Popup>
            </Marker>
          )}

          {/* Result Markers */}
          {results && results.map((result, index) => (
            result.found && result.latitude && result.longitude && (
              <Marker
                key={index}
                position={[result.latitude, result.longitude]}
                icon={result.confidence < 0.7 ? lowConfidenceIcon : resultIcon}
              >
                <Popup>
                  <strong>{result.villageName}</strong><br />
                  {result.formattedAddress && <span>{result.formattedAddress}<br /></span>}
                  Lat: {result.latitude.toFixed(4)}<br />
                  Lng: {result.longitude.toFixed(4)}<br />
                  {result.confidence && (
                    <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                  )}
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        {!center && (
          <div className="map-overlay">
            <p>{t('search.clickToSetCenter')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSearch;
