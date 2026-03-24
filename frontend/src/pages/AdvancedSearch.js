import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { geocodingAPI, aiAPI } from '../services/api';
import { toast } from 'react-toastify';
import MapSearch from '../components/MapSearch';
import FilterOptions from '../components/FilterOptions';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdvancedSearch.css';

const AdvancedSearch = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(20);
  const [villageName, setVillageName] = useState('');
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAreaSearching, setIsAreaSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [areaSearchResults, setAreaSearchResults] = useState(null);
  const [villageInfo, setVillageInfo] = useState(null);
  const [villageInfoLoading, setVillageInfoLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // Handle selected result from AdvancedSearchResults page
  useEffect(() => {
    if (location.state?.selectedResult) {
      const result = location.state.selectedResult;
      setSelectedResult(result);
      setVillageName(result.name || '');
      if (result.lat && result.lng) {
        setCenter({ lat: result.lat, lng: result.lng });
      }
      toast.success(
        language === 'fr'
          ? `Résultat sélectionné: ${result.name}`
          : `Selected result: ${result.name}`
      );
    }
  }, [location.state, language]);

  // Haversine distance in km
  const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setResults([]); // Clear previous results on new search

    try {
      const response = await geocodingAPI.geocodeSingle(searchParams.villageName, {
        ...filters,
        centerLat: searchParams.center?.lat,
        centerLng: searchParams.center?.lng,
        radius: searchParams.radius
      });

      if (response.success) {
        const newResult = response.data;

        // Filter by radius if center is defined and result was found
        if (
          newResult.found &&
          searchParams.center &&
          newResult.latitude &&
          newResult.longitude
        ) {
          const dist = haversineDistance(
            searchParams.center.lat,
            searchParams.center.lng,
            newResult.latitude,
            newResult.longitude
          );
          if (dist > searchParams.radius) {
            toast.warning(
              language === 'fr'
                ? `Village trouvé mais hors du rayon de ${searchParams.radius} km (${dist.toFixed(1)} km)`
                : `Village found but outside the ${searchParams.radius} km radius (${dist.toFixed(1)} km)`
            );
            return;
          }
          newResult.distance = parseFloat(dist.toFixed(2));
        }

        setResults(prev => [...prev, newResult]);

        if (newResult.found) {
          toast.success(`${t('results.status.found')}: ${newResult.villageName}`);
        } else {
          toast.warning(`${t('results.status.notFound')}: ${newResult.villageName}`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(t('messages.geocodingError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Multi-source area search - find village across all sources
  const handleSearchArea = async () => {
    if (!villageName.trim()) {
      toast.warning(language === 'fr' 
        ? 'Veuillez entrer le nom d\'un village' 
        : 'Please enter a village name');
      return;
    }
    if (!center) {
      toast.warning(language === 'fr' 
        ? 'Veuillez sélectionner un centre sur la carte' 
        : 'Please select a center on the map');
      return;
    }

    setIsAreaSearching(true);
    setAreaSearchResults(null);

    try {
      const response = await fetch('/api/geocoding/search-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          villageName: villageName.trim(),
          center: { lat: center.lat, lng: center.lng },
          radius: parseFloat(radius),
          filters
        })
      });
      const result = await response.json();
      
      if (result.success) {
        // Store results in sessionStorage and navigate to results page
        sessionStorage.setItem('advancedSearchResults', JSON.stringify(result.data));
        navigate('/advanced-search-results');
      } else {
        toast.error(
          language === 'fr'
            ? 'Erreur: ' + (result.error || 'Recherche échouée')
            : 'Error: ' + (result.error || 'Search failed')
        );
      }
    } catch (error) {
      console.error('Multi-source search error:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur de connexion: ' + error.message
          : 'Connection error: ' + error.message
      );
    } finally {
      setIsAreaSearching(false);
    }
  };

  const handleViewResults = () => {
    if (results.length > 0) {
      sessionStorage.setItem('geocodingResults', JSON.stringify({
        results,
        statistics: {
          total: results.length,
          found: results.filter(r => r.found).length,
          notFound: results.filter(r => !r.found).length
        },
        filters
      }));
      navigate('/results');
    }
  };

  const handleClearResults = () => {
    setResults([]);
    setVillageName('');
    setCenter(null);
    setAreaSearchResults(null);
  };

  // Get AI-powered village information
  const handleGetVillageInfo = async () => {
    // Check if we have a village name or center coordinates
    if (!villageName && !center) {
      toast.warning(language === 'fr' 
        ? 'Veuillez entrer un nom de village ou sélectionner un point sur la carte' 
        : 'Please enter a village name or select a point on the map');
      return;
    }

    setVillageInfoLoading(true);
    setVillageInfo(null);

    try {
      // Use center coordinates if available, otherwise use default coordinates
      const lat = center?.lat || 0;
      const lng = center?.lng || 0;
      const name = villageName || (language === 'fr' ? 'Point sélectionné' : 'Selected point');

      const response = await aiAPI.getVillageInfo(name, lat, lng);

      if (response.success) {
        setVillageInfo(response.data);
        toast.success(
          language === 'fr'
            ? `Informations récupérées pour ${name}`
            : `Information retrieved for ${name}`
        );
      }
    } catch (error) {
      console.error('Village info error:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur lors de la récupération des informations du village'
          : 'Error retrieving village information'
      );
    } finally {
      setVillageInfoLoading(false);
    }
  };

  return (
    <div className="advanced-search-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('search.title')}</h1>
          <p className="page-subtitle">{t('search.subtitle')}</p>
        </header>

        {/* Filters */}
        <FilterOptions
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* AI Village Info Button */}
        <div className="ai-section">
          <button 
            className="btn btn-ai btn-village-info"
            onClick={handleGetVillageInfo}
            disabled={villageInfoLoading || (!villageName && !center)}
          >
            {villageInfoLoading 
              ? '⏳ ' + (language === 'fr' ? 'Chargement...' : 'Loading...') 
              : '🏘️ ' + (language === 'fr' ? 'Info Village IA' : 'AI Village Info')}
          </button>
        </div>

        {/* Village Information Panel */}
        {villageInfo && (
          <div className="village-info-panel">
            <h3>🏘️ {language === 'fr' ? 'Informations sur le Village' : 'Village Information'}</h3>
            
            <div className="village-info-content">
              <div className="info-section">
                <h4>{language === 'fr' ? 'Localisation' : 'Location'}</h4>
                <p><strong>{villageInfo.villageName || villageInfo.queriedName}</strong></p>
                {villageInfo.location && (
                  <p>
                    {villageInfo.location.region && `${villageInfo.location.region}, `}
                    {villageInfo.location.country || ''}
                  </p>
                )}
                {villageInfo.coordinates && (
                  <p className="coordinates">
                    📍 {villageInfo.coordinates.latitude?.toFixed(4)}, {villageInfo.coordinates.longitude?.toFixed(4)}
                  </p>
                )}
              </div>

              {villageInfo.population && villageInfo.population.estimate !== 'Unknown' && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Population' : 'Population'}</h4>
                  <p>
                    {villageInfo.population.estimate}
                    {villageInfo.population.year && ` (${villageInfo.population.year})`}
                  </p>
                  {villageInfo.population.source && (
                    <p className="source">{language === 'fr' ? 'Source' : 'Source'}: {villageInfo.population.source}</p>
                  )}
                </div>
              )}

              {villageInfo.indigenousGroups && villageInfo.indigenousGroups.length > 0 && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Groupes Ethniques' : 'Indigenous Groups'}</h4>
                  <ul>
                    {villageInfo.indigenousGroups.map((group, idx) => (
                      <li key={idx}>{group}</li>
                    ))}
                  </ul>
                </div>
              )}

              {villageInfo.historicalNotes && villageInfo.historicalNotes.length > 0 && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Notes Historiques' : 'Historical Notes'}</h4>
                  <ul>
                    {villageInfo.historicalNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {villageInfo.landmarks && villageInfo.landmarks.length > 0 && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Points d\'Intérêt' : 'Landmarks'}</h4>
                  <ul>
                    {villageInfo.landmarks.map((landmark, idx) => (
                      <li key={idx}>{landmark}</li>
                    ))}
                  </ul>
                </div>
              )}

              {villageInfo.culturalContext && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Contexte Culturel' : 'Cultural Context'}</h4>
                  <p>{villageInfo.culturalContext}</p>
                </div>
              )}

              {villageInfo.economicActivities && villageInfo.economicActivities.length > 0 && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Activités Économiques' : 'Economic Activities'}</h4>
                  <ul>
                    {villageInfo.economicActivities.map((activity, idx) => (
                      <li key={idx}>{activity}</li>
                    ))}
                  </ul>
                </div>
              )}

              {villageInfo.accessibility && villageInfo.accessibility !== 'Unknown' && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Accessibilité' : 'Accessibility'}</h4>
                  <p>{villageInfo.accessibility}</p>
                </div>
              )}

              {villageInfo.additionalInfo && (
                <div className="info-section">
                  <h4>{language === 'fr' ? 'Informations Supplémentaires' : 'Additional Information'}</h4>
                  <p>{villageInfo.additionalInfo}</p>
                </div>
              )}
            </div>

            <button 
              className="btn btn-sm btn-secondary close-village-info"
              onClick={() => setVillageInfo(null)}
            >
              {t('common.close')}
            </button>
          </div>
        )}

        {/* Map Search */}
        <MapSearch
          center={center}
          onCenterChange={setCenter}
          radius={radius}
          onRadiusChange={setRadius}
          results={results}
          onSearch={handleSearch}
          villageName={villageName}
          onVillageNameChange={setVillageName}
        />

        {/* Search Buttons */}
        <div className="search-buttons-container">
          <button
            className="btn btn-primary search-btn"
            onClick={() => handleSearch({ villageName, center, radius })}
            disabled={isLoading || !villageName}
          >
            {isLoading ? '⏳ ' : '🔍 '}
            {language === 'fr' ? 'Rechercher le Village' : 'Search Village'}
          </button>
          
          <button
            className="btn btn-secondary search-area-btn"
            onClick={handleSearchArea}
            disabled={isAreaSearching || !center || !villageName.trim()}
          >
            {isAreaSearching ? '⏳ ' : '🌐 '}
            {language === 'fr' ? 'Recherche Multi-Sources' : 'Multi-Source Search'}
          </button>
        </div>

        {/* Area Search Results Summary */}
        {areaSearchResults && (
          <div className="area-search-summary">
            <h3>
              {language === 'fr' ? '📍 Résultats de la Zone' : '📍 Area Results'}
            </h3>
            <div className="area-stats">
              <span className="stat-item">
                <strong>{areaSearchResults.count}</strong> 
                {language === 'fr' ? ' emplacements trouvés' : ' locations found'}
              </span>
              {areaSearchResults.statistics?.byType && (
                <div className="type-breakdown">
                  {Object.entries(areaSearchResults.statistics.byType).map(([type, count]) => (
                    count > 0 && (
                      <span key={type} className="type-stat">
                        {type}: {count}
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Actions */}
        {results.length > 0 && (
          <div className="search-results-actions">
            <div className="results-summary">
              <span className="summary-item">
                <strong>{results.length}</strong> {t('results.stats.total')}
              </span>
              <span className="summary-item success">
                <strong>{results.filter(r => r.found).length}</strong> {t('results.stats.found')}
              </span>
              <span className="summary-item error">
                <strong>{results.filter(r => !r.found).length}</strong> {t('results.stats.notFound')}
              </span>
            </div>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleViewResults}>
                {t('batch.actions.viewResults')}
              </button>
              <button className="btn btn-secondary" onClick={handleClearResults}>
                {t('common.clear')}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && <LoadingSpinner message={t('common.processing')} />}
        {aiLoading && <LoadingSpinner message={t('ai.loading')} />}
        {villageInfoLoading && (
          <LoadingSpinner 
            message={language === 'fr' 
              ? 'Récupération des informations du village...' 
              : 'Retrieving village information...'
            } 
          />
        )}
        {isAreaSearching && (
          <LoadingSpinner 
            message={language === 'fr' 
              ? 'Recherche des emplacements dans la zone...' 
              : 'Searching for locations in area...'
            } 
          />
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;