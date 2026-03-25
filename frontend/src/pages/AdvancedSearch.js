import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { geocodingAPI, geoAgentAPI } from '../services/api';
import { toast } from 'react-toastify';
import MapSearch from '../components/MapSearch';
import FilterOptions from '../components/FilterOptions';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdvancedSearch.css';

// ─── Haversine distance (km) ───────────────────────────────────────────────
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

// ─── Filter results within radius ─────────────────────────────────────────
const filterByRadius = (results, center, radius) => {
  if (!center || !results) return results || [];
  return results.filter(r => {
    if (!r.found || !r.latitude || !r.longitude) return false;
    const dist = haversineDistance(center.lat, center.lng, r.latitude, r.longitude);
    r.distance = parseFloat(dist.toFixed(2));
    return dist <= radius;
  });
};

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
  const [areaSearchResults, setAreaSearchResults] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  // AI best result state
  const [aiBestResult, setAiBestResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Similar villages suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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

  // ── Fetch similar village suggestions within radius ──────────────────────
  const fetchSuggestions = async (name, country) => {
    if (!name || name.trim().length < 2) return;
    setSuggestionsLoading(true);
    setSuggestions([]);
    try {
      const data = await geoAgentAPI.suggest(name.trim(), country || '');
      const list = Array.isArray(data) ? data : data.suggestions || [];
      setSuggestions(list);
    } catch (err) {
      console.error('Suggestions error:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // ── Use GeoAgent to pick best result among candidates ───────────────────
  const pickBestWithAI = async (candidates, name, country) => {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    setAiLoading(true);
    try {
      const data = await geoAgentAPI.geocode(name.trim(), country || '');
      if (data && data.found) {
        setAiBestResult(data);
        return data;
      }
    } catch (err) {
      console.error('GeoAgent pick best error:', err);
    } finally {
      setAiLoading(false);
    }
    return candidates[0];
  };

  // ── Single village search ────────────────────────────────────────────────
  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setResults([]);
    setAiBestResult(null);
    setSuggestions([]);

    try {
      // 1. Call standard geocoding API
      const response = await geocodingAPI.geocodeSingle(searchParams.villageName, {
        ...filters,
        centerLat: searchParams.center?.lat,
        centerLng: searchParams.center?.lng,
        radius: searchParams.radius,
      });

      if (response.success) {
        const newResult = response.data;

        // 2. Check distance from center if set
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
            // Still fetch similar suggestions
            await fetchSuggestions(searchParams.villageName, filters.country);
            return;
          }
          newResult.distance = parseFloat(dist.toFixed(2));
        }

        setResults([newResult]);

        // 3. If not found, fetch similar suggestions automatically
        if (!newResult.found) {
          toast.warning(`${t('results.status.notFound')}: ${newResult.villageName}`);
          await fetchSuggestions(searchParams.villageName, filters.country);
        } else {
          toast.success(`${t('results.status.found')}: ${newResult.villageName}`);
          // Also fetch suggestions in background
          fetchSuggestions(searchParams.villageName, filters.country);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(t('messages.geocodingError'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Multi-source area search with AI best-pick ───────────────────────────
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
    setAiBestResult(null);
    setSuggestions([]);

    try {
      const apiBase = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${apiBase}/geocoding/search-area`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          villageName: villageName.trim(),
          center: { lat: center.lat, lng: center.lng },
          radius: parseFloat(radius),
          filters,
        }),
      });
      const result = await response.json();

      if (result.success) {
        // Filter results within radius
        const allResults = result.data?.results || result.data || [];
        const inRadius = filterByRadius(
          Array.isArray(allResults) ? allResults : [allResults],
          center,
          radius
        );

        if (inRadius.length === 0) {
          toast.warning(
            language === 'fr'
              ? `Aucun village trouvé dans un rayon de ${radius} km`
              : `No village found within ${radius} km radius`
          );
          await fetchSuggestions(villageName, filters.country);
        } else {
          // Let AI pick the best result from multiple sources
          const best = await pickBestWithAI(inRadius, villageName, filters.country);

          // Save to sessionStorage and navigate
          sessionStorage.setItem('advancedSearchResults', JSON.stringify({
            ...result.data,
            results: inRadius,
            aiBestResult: best,
          }));
          navigate('/advanced-search-results');
        }
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
          notFound: results.filter(r => !r.found).length,
        },
        filters,
      }));
      navigate('/results');
    }
  };

  const handleClearResults = () => {
    setResults([]);
    setVillageName('');
    setCenter(null);
    setAreaSearchResults(null);
    setAiBestResult(null);
    setSuggestions([]);
  };

  return (
    <div className="advanced-search-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('search.title')}</h1>
          <p className="page-subtitle">{t('search.subtitle')}</p>
        </header>

        {/* Filters */}
        <FilterOptions filters={filters} onFiltersChange={setFilters} />

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

        {/* Single search + multi-source buttons (no duplicate) */}
        <div className="search-buttons-container">
          <button
            className="btn btn-secondary search-area-btn"
            onClick={handleSearchArea}
            disabled={isAreaSearching || !center || !villageName.trim()}
          >
            {isAreaSearching ? '⏳ ' : '🌐 '}
            {language === 'fr' ? 'Recherche Multi-Sources' : 'Multi-Source Search'}
          </button>
        </div>

        {/* AI Best Result Banner */}
        {aiBestResult && (
          <div className="ai-best-result-banner">
            <span className="ai-badge">🤖 {language === 'fr' ? 'Meilleur résultat IA' : 'AI Best Result'}</span>
            <strong>{aiBestResult.villageName}</strong>
            {aiBestResult.latitude && (
              <span className="ai-coords">
                {aiBestResult.latitude.toFixed(5)}, {aiBestResult.longitude.toFixed(5)}
              </span>
            )}
            {aiBestResult.reliability && (
              <span className={`reliability-badge reliability-${aiBestResult.reliability.toLowerCase()}`}>
                {aiBestResult.reliability}
              </span>
            )}
          </div>
        )}

        {/* Similar Village Suggestions */}
        {(suggestions.length > 0 || suggestionsLoading) && (
          <div className="suggestions-panel">
            <h4 className="suggestions-title">
              🔍 {language === 'fr' ? 'Villages similaires suggérés' : 'Similar village suggestions'}
            </h4>
            {suggestionsLoading ? (
              <p className="suggestions-loading">
                {language === 'fr' ? 'Chargement des suggestions...' : 'Loading suggestions...'}
              </p>
            ) : (
              <div className="suggestions-chips">
                {suggestions.map((s, i) => {
                  const name = typeof s === 'string' ? s : s.name || s.villageName || s;
                  return (
                    <button
                      key={i}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => setVillageName(name)}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

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

        {/* Loaders */}
        {isLoading && <LoadingSpinner message={t('common.processing')} />}
        {aiLoading && (
          <LoadingSpinner
            message={language === 'fr'
              ? '🤖 Analyse IA en cours...'
              : '🤖 AI analysis in progress...'}
          />
        )}
        {isAreaSearching && (
          <LoadingSpinner
            message={language === 'fr'
              ? 'Recherche des emplacements dans la zone...'
              : 'Searching for locations in area...'}
          />
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
