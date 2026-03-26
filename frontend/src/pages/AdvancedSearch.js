import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { geoAgentAPI, searchAreaAPI, geocodingAPI } from '../services/api';
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

// ─── Normalize a result object ─────────────────────────────────────────────
const normalizeResult = (r) => {
  const lat = parseFloat(r.latitude || r.lat || 0);
  const lng = parseFloat(r.longitude || r.lng || 0);
  return { ...r, latitude: lat, longitude: lng };
};

const AdvancedSearch = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [center, setCenter]                       = useState(null);
  const [radius, setRadius]                       = useState(20);
  const [villageName, setVillageName]             = useState('');
  const [filters, setFilters]                     = useState({});
  const [results, setResults]                     = useState([]);
  const [isLoading, setIsLoading]                 = useState(false);
  const [aiBestResult, setAiBestResult]           = useState(null);
  const [aiLoading, setAiLoading]                 = useState(false);
  const [suggestions, setSuggestions]             = useState([]);
  const [suggestionMarkers, setSuggestionMarkers] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    if (location.state?.selectedResult) {
      const r = location.state.selectedResult;
      setVillageName(r.name || '');
      if (r.lat && r.lng) setCenter({ lat: r.lat, lng: r.lng });
    }
  }, [location.state]);

  // ── Fetch similar name suggestions (no mandatory radius filtering) ─────────
  const fetchSuggestions = async (name, country, searchCenter, searchRadius) => {
    if (!name || name.trim().length < 2) return;
    setSuggestionsLoading(true);
    setSuggestions([]);
    setSuggestionMarkers([]);
    try {
      const data = await geoAgentAPI.suggest(name.trim(), country || '');
      const rawList = Array.isArray(data) ? data : (data?.suggestions || []);

      // Build suggestion objects — try geocoding each, but don't discard on failure
      const enriched = await Promise.allSettled(
        rawList.slice(0, 8).map(async (s) => {
          const sName = typeof s === 'string' ? s : (s?.name || s?.villageName || '');
          if (!sName) return null;
          try {
            const geo = await geoAgentAPI.geocode(sName, country || '');
            if (geo?.found && geo.latitude && geo.longitude) {
              const item = { name: sName, ...geo };
              if (searchCenter) {
                const dist = haversineDistance(
                  searchCenter.lat, searchCenter.lng, geo.latitude, geo.longitude
                );
                item.distance = parseFloat(dist.toFixed(2));
                item.withinRadius = dist <= searchRadius;
              }
              return item;
            }
          } catch (e) {
            console.warn('[Suggestions] geocode failed for', sName, e.message);
          }
          // Return name-only if geocoding failed — still show it
          return { name: sName };
        })
      );

      const items = enriched
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      // Sort: within radius first, then alphabetical
      items.sort((a, b) => {
        if (a.withinRadius && !b.withinRadius) return -1;
        if (!a.withinRadius && b.withinRadius) return 1;
        return a.name.localeCompare(b.name);
      });

      setSuggestions(items);
      setSuggestionMarkers(items.filter(s => s.latitude && s.longitude));
    } catch (err) {
      console.error('[Suggestions] error:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // ── Main search ────────────────────────────────────────────────────────────
  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setResults([]);
    setAiBestResult(null);
    setSuggestions([]);
    setSuggestionMarkers([]);
    setSelectedSuggestion(null);

    const searchCenter = searchParams?.center ?? center;
    const searchRadius = searchParams?.radius ?? radius;
    const name        = searchParams?.villageName ?? villageName;
    const country     = filters?.country || '';

    if (!name || !name.trim()) {
      toast.warning(language === 'fr' ? 'Entrez un nom de village' : 'Enter a village name');
      setIsLoading(false);
      return;
    }

    try {
      let candidates = [];

      // ── Step 1: try search-area (multi-source) ──────────────────────────
      if (searchCenter) {
        try {
          console.log('[Search] calling searchAreaAPI with', { name, searchCenter, searchRadius, country });
          const areaData = await searchAreaAPI.searchArea(
            name, { lat: searchCenter.lat, lng: searchCenter.lng },
            searchRadius, country || null
          );
          console.log('[Search] searchAreaAPI response:', areaData);

          const raw = areaData?.results
            || areaData?.data?.results
            || areaData?.data
            || [];

          const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);

          candidates = list
            .map(r => {
              const nr = normalizeResult(r);
              if (!nr.latitude || !nr.longitude) return null;
              const dist = haversineDistance(searchCenter.lat, searchCenter.lng, nr.latitude, nr.longitude);
              if (dist > searchRadius) return null;
              return { ...nr, distance: parseFloat(dist.toFixed(2)) };
            })
            .filter(Boolean);

          console.log('[Search] candidates after radius filter:', candidates.length);
        } catch (areaErr) {
          console.warn('[Search] searchAreaAPI failed, falling back to geocodeSingle:', areaErr.message);
        }
      }

      // ── Step 2: fallback — geocodeSingle ───────────────────────────────
      if (candidates.length === 0) {
        try {
          console.log('[Search] trying geocodeSingle fallback');
          const singleResp = await geocodingAPI.geocodeSingle(name, {
            ...filters,
            centerLat: searchCenter?.lat,
            centerLng: searchCenter?.lng,
            radius: searchRadius,
          });
          console.log('[Search] geocodeSingle response:', singleResp);
          if (singleResp?.success && singleResp?.data?.found) {
            const nr = normalizeResult(singleResp.data);
            if (searchCenter && nr.latitude && nr.longitude) {
              const dist = haversineDistance(searchCenter.lat, searchCenter.lng, nr.latitude, nr.longitude);
              if (dist <= searchRadius) {
                candidates = [{ ...nr, distance: parseFloat(dist.toFixed(2)) }];
              }
            } else if (nr.latitude) {
              candidates = [nr];
            }
          }
        } catch (singleErr) {
          console.warn('[Search] geocodeSingle also failed:', singleErr.message);
        }
      }

      // ── Step 3: fallback — GeoAgent direct ────────────────────────────
      if (candidates.length === 0) {
        try {
          console.log('[Search] trying GeoAgent direct fallback');
          const geo = await geoAgentAPI.geocode(name, country);
          console.log('[Search] GeoAgent response:', geo);
          if (geo?.found && geo.latitude && geo.longitude) {
            const nr = normalizeResult(geo);
            if (searchCenter) {
              const dist = haversineDistance(searchCenter.lat, searchCenter.lng, nr.latitude, nr.longitude);
              if (dist <= searchRadius) {
                candidates = [{ ...nr, distance: parseFloat(dist.toFixed(2)) }];
              }
            } else {
              candidates = [nr];
            }
          }
        } catch (geoErr) {
          console.warn('[Search] GeoAgent also failed:', geoErr.message);
        }
      }

      // ── No results found ───────────────────────────────────────────────
      if (candidates.length === 0) {
        toast.warning(
          language === 'fr'
            ? `Aucun village "${name}" trouvé dans le rayon de ${searchRadius} km — voici des suggestions`
            : `No village "${name}" found within ${searchRadius} km — here are suggestions`
        );
        await fetchSuggestions(name, country, searchCenter, searchRadius);
        return;
      }

      // ── Results found ──────────────────────────────────────────────────
      setResults(candidates);
      toast.success(
        language === 'fr'
          ? `${candidates.length} résultat(s) trouvé(s)`
          : `${candidates.length} result(s) found`
      );

      // ── Step 4: AI picks best ──────────────────────────────────────────
      setAiLoading(true);
      try {
        const geo = await geoAgentAPI.geocode(name, country);
        if (geo?.found && geo.latitude && geo.longitude) {
          const nr = normalizeResult(geo);
          if (searchCenter) {
            const dist = haversineDistance(searchCenter.lat, searchCenter.lng, nr.latitude, nr.longitude);
            if (dist <= searchRadius) {
              setAiBestResult({ ...nr, distance: parseFloat(dist.toFixed(2)) });
            } else {
              // AI result outside radius → use best candidate by confidence
              const best = [...candidates].sort(
                (a, b) => (b.confidence || b.score || 0) - (a.confidence || a.score || 0)
              )[0];
              setAiBestResult(best);
            }
          } else {
            setAiBestResult(nr);
          }
        } else {
          setAiBestResult(candidates[0]);
        }
      } catch (aiErr) {
        console.warn('[AI] pick best failed:', aiErr.message);
        setAiBestResult(candidates[0]);
      } finally {
        setAiLoading(false);
      }

      // ── Step 5: fetch suggestions in background ────────────────────────
      fetchSuggestions(name, country, searchCenter, searchRadius);

    } catch (error) {
      console.error('[Search] unexpected error:', error);
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

        {/* Similar Villages */}
        {(suggestions.length > 0 || suggestionsLoading) && (
          <div className="suggestions-panel">
            <h4 className="suggestions-title">
              🔍 {language === 'fr' ? 'Villages similaires suggérés' : 'Similar village suggestions'}
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
                    className={`suggestion-chip ${selectedSuggestion?.name === s.name ? 'active' : ''} ${s.withinRadius === false ? 'out-of-radius' : ''}`}
                    onClick={() => handleSuggestionClick(s)}
                    title={s.latitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : ''}
                  >
                    {s.name}
                    {s.distance !== undefined && (
                      <span className="chip-distance">{s.distance} km</span>
                    )}
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

        {isLoading && (
          <LoadingSpinner message={language === 'fr' ? 'Recherche en cours...' : 'Searching...'} />
        )}
        {aiLoading && (
          <LoadingSpinner message={language === 'fr' ? '🤖 Analyse IA...' : '🤖 AI analysis...'} />
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
