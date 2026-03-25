import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { geoAgentAPI, searchAreaAPI } from '../services/api';
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
  const [aiBestResult, setAiBestResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionMarkers, setSuggestionMarkers] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    if (location.state?.selectedResult) {
      const result = location.state.selectedResult;
      setVillageName(result.name || '');
      if (result.lat && result.lng) setCenter({ lat: result.lat, lng: result.lng });
    }
  }, [location.state]);

  // ── Fetch suggestions filtered by radius ──────────────────────────────────
  const fetchSuggestions = async (name, country, searchCenter, searchRadius) => {
    if (!name || name.trim().length < 2) return;
    setSuggestionsLoading(true);
    setSuggestions([]);
    setSuggestionMarkers([]);
    try {
      const data = await geoAgentAPI.suggest(name.trim(), country || '');
      const list = Array.isArray(data) ? data : data.suggestions || [];

      const enriched = await Promise.all(
        list.slice(0, 8).map(async (s) => {
          const sName = typeof s === 'string' ? s : s.name || s.villageName || '';
          if (!sName) return null;
          try {
            const geo = await geoAgentAPI.geocode(sName, country || '');
            if (geo && geo.success && geo.best) {
              const lat = geo.best.lat;
              const lng = geo.best.lng;
              if (searchCenter) {
                const dist = haversineDistance(searchCenter.lat, searchCenter.lng, lat, lng);
                if (dist > searchRadius) return null;
                return { name: sName, latitude: lat, longitude: lng, source: geo.best.source, confidence: geo.best.confidence, reliability: geo.reliability?.label, distance: parseFloat(dist.toFixed(2)) };
              }
              return { name: sName, latitude: lat, longitude: lng, source: geo.best.source, confidence: geo.best.confidence, reliability: geo.reliability?.label };
            }
          } catch (e) {}
          return searchCenter ? null : { name: sName };
        })
      );

      const filtered = enriched.filter(Boolean);
      setSuggestions(filtered);
      setSuggestionMarkers(filtered.filter(s => s.latitude && s.longitude));
    } catch (err) {
      console.error('Suggestions error:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // ── Main search: multi-source + AI best pick ──────────────────────────────
  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setResults([]);
    setAiBestResult(null);
    setSuggestions([]);
    setSuggestionMarkers([]);
    setSelectedSuggestion(null);

    const searchCenter = searchParams.center || center;
    const searchRadius = searchParams.radius || radius;
    const name = searchParams.villageName || villageName;
    const country = filters.country || '';

    try {
      let candidates = [];

      if (searchCenter) {
        // Multi-source search within radius
        const areaData = await searchAreaAPI.searchArea(
          name,
          { lat: searchCenter.lat, lng: searchCenter.lng },
          searchRadius,
          country || null
        );
        const raw = areaData?.results || areaData?.data?.results || [];
        candidates = raw
          .map(r => {
            const lat = r.latitude || r.lat;
            const lng = r.longitude || r.lng;
            if (!lat || !lng) return null;
            const dist = haversineDistance(searchCenter.lat, searchCenter.lng, lat, lng);
            if (dist > searchRadius) return null;
            return { ...r, latitude: lat, longitude: lng, distance: parseFloat(dist.toFixed(2)) };
          })
          .filter(Boolean);
      } else {
        // No center: GeoAgent direct
        const geo = await geoAgentAPI.geocode(name, country);
        if (geo && geo.success && geo.best) {
          candidates = [{
            ...geo.best,
            latitude: geo.best.lat,
            longitude: geo.best.lng,
            villageName: name,
            source: geo.best.source,
            confidence: geo.best.confidence,
            reliability: geo.reliability?.label,
            found: true,
          }];
        }
      }

      if (candidates.length === 0) {
        toast.warning(
          language === 'fr'
            ? `Aucun village trouvé dans le rayon de ${searchRadius} km`
            : `No village found within ${searchRadius} km radius`
        );
        await fetchSuggestions(name, country, searchCenter, searchRadius);
        return;
      }

      setResults(candidates);

      // AI picks best
      setAiLoading(true);
      try {
        const geo = await geoAgentAPI.geocode(name, country);
        if (geo && geo.success && geo.best) {
          const geoNormalized = {
            ...geo.best,
            latitude: geo.best.lat,
            longitude: geo.best.lng,
            villageName: name,
            source: geo.best.source,
            confidence: geo.best.confidence,
            reliability: geo.reliability?.label,
          };
          if (searchCenter) {
            const dist = haversineDistance(searchCenter.lat, searchCenter.lng, geoNormalized.latitude, geoNormalized.longitude);
            const best = dist <= searchRadius
              ? { ...geoNormalized, distance: parseFloat(dist.toFixed(2)) }
              : candidates.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
            setAiBestResult(best);
          } else {
            setAiBestResult(geoNormalized);
          }
        } else {
          setAiBestResult(candidates[0]);
        }
      } catch (e) {
        setAiBestResult(candidates[0]);
      } finally {
        setAiLoading(false);
      }

      toast.success(
        language === 'fr'
          ? `${candidates.length} résultat(s) trouvé(s)`
          : `${candidates.length} result(s) found`
      );

      fetchSuggestions(name, country, searchCenter, searchRadius);

    } catch (error) {
      console.error('Search error:', error);
      toast.error(t('messages.geocodingError'));
      await fetchSuggestions(name, country, searchCenter, searchRadius);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setVillageName(suggestion.name);
  };

  const handleViewResults = () => {
    if (results.length > 0) {
      sessionStorage.setItem('geocodingResults', JSON.stringify({
        results,
        statistics: { total: results.length, found: results.length, notFound: 0 },
        aiBestResult,
        filters,
      }));
      navigate('/results');
    }
  };

  const handleClearResults = () => {
    setResults([]);
    setVillageName('');
    setCenter(null);
    setAiBestResult(null);
    setSuggestions([]);
    setSuggestionMarkers([]);
    setSelectedSuggestion(null);
  };

  return (
    <div className="advanced-search-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('search.title')}</h1>
          <p className="page-subtitle">{t('search.subtitle')}</p>
        </header>

        <FilterOptions filters={filters} onFiltersChange={setFilters} />

        {/* Map — single Search Village button inside MapSearch */}
        <MapSearch
          center={center}
          onCenterChange={setCenter}
          radius={radius}
          onRadiusChange={setRadius}
          results={results}
          suggestionMarkers={suggestionMarkers}
          aiBestResult={aiBestResult}
          onSearch={handleSearch}
          villageName={villageName}
          onVillageNameChange={setVillageName}
        />

        {/* AI Best Result Banner */}
        {aiBestResult && !aiLoading && (
          <div className="ai-best-result-banner">
            <span className="ai-badge">🤖 {language === 'fr' ? 'Meilleur résultat IA' : 'AI Best Result'}</span>
            <strong>{aiBestResult.villageName || aiBestResult.name}</strong>
            {aiBestResult.latitude && (
              <span className="ai-coords">
                {Number(aiBestResult.latitude).toFixed(5)}, {Number(aiBestResult.longitude).toFixed(5)}
              </span>
            )}
            {aiBestResult.source && <span className="ai-source">📡 {aiBestResult.source}</span>}
            {aiBestResult.distance !== undefined && <span className="ai-distance">📍 {aiBestResult.distance} km</span>}
            {aiBestResult.reliability && (
              <span className={`reliability-badge reliability-${aiBestResult.reliability.toLowerCase()}`}>
                {aiBestResult.reliability}
              </span>
            )}
          </div>
        )}

        {/* Selected Suggestion Detail Card */}
        {selectedSuggestion && selectedSuggestion.latitude && (
          <div className="selected-suggestion-card">
            <div className="suggestion-card-header">
              <h4>📍 {selectedSuggestion.name}</h4>
              <button className="btn btn-sm btn-secondary" onClick={() => setSelectedSuggestion(null)}>✕</button>
            </div>
            <div className="suggestion-details">
              <span><strong>Latitude:</strong> {Number(selectedSuggestion.latitude).toFixed(5)}</span>
              <span><strong>Longitude:</strong> {Number(selectedSuggestion.longitude).toFixed(5)}</span>
              {selectedSuggestion.source && <span><strong>Source:</strong> {selectedSuggestion.source}</span>}
              {selectedSuggestion.distance !== undefined && <span><strong>Distance:</strong> {selectedSuggestion.distance} km</span>}
              {selectedSuggestion.label && <span><strong>{language === 'fr' ? 'Adresse' : 'Address'}:</strong> {selectedSuggestion.label}</span>}
              {selectedSuggestion.reliability && <span><strong>{language === 'fr' ? 'Fiabilité' : 'Reliability'}:</strong> {selectedSuggestion.reliability}</span>}
            </div>
          </div>
        )}

        {/* Similar Villages within radius */}
        {(suggestions.length > 0 || suggestionsLoading) && (
          <div className="suggestions-panel">
            <h4 className="suggestions-title">
              🔍 {language === 'fr' ? 'Villages similaires dans le rayon' : 'Similar villages within radius'}
            </h4>
            {suggestionsLoading ? (
              <p className="suggestions-loading">
                {language === 'fr' ? 'Recherche de villages similaires...' : 'Searching similar villages...'}
              </p>
            ) : (
              <div className="suggestions-chips">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`suggestion-chip ${selectedSuggestion?.name === s.name ? 'active' : ''}`}
                    onClick={() => handleSuggestionClick(s)}
                    title={s.latitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : ''}
                  >
                    {s.name}
                    {s.distance !== undefined && <span className="chip-distance">{s.distance} km</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results actions */}
        {results.length > 0 && (
          <div className="search-results-actions">
            <div className="results-summary">
              <span className="summary-item">
                <strong>{results.length}</strong> {t('results.stats.total')}
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

        {isLoading && <LoadingSpinner message={language === 'fr' ? 'Recherche multi-sources...' : 'Multi-source search...'} />}
        {aiLoading && <LoadingSpinner message={language === 'fr' ? '🤖 Analyse IA...' : '🤖 AI analysis...'} />}
      </div>
    </div>
  );
};

export default AdvancedSearch;
