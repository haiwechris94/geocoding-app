import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { geoAgentAPI } from '../services/api';
import './GeoAgent.css';

const GeoAgent = () => {
  const { language } = useLanguage();
  const lang = language;
  
  // Search state
  const [villageName, setVillageName] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!villageName.trim()) return;

    if (!villageName || !country) {
      setError(lang === 'fr' ? 'Le village et le pays sont requis.' : 'Village and country are required.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSuggestions([]);
    
    try {
      const data = await geoAgentAPI.geocode(villageName.trim(), country.trim());
      setResult(data);
    } catch (error) {
      console.error('GeoAgent search error:', error);
      setResult({ found: false, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!villageName.trim()) return;
    
    setSuggestionsLoading(true);
    
    try {
      const data = await geoAgentAPI.suggest(villageName.trim(), country.trim());
      setSuggestions(Array.isArray(data) ? data : data.suggestions || []);
    } catch (error) {
      console.error('GeoAgent suggestions error:', error);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const name = typeof suggestion === 'string' ? suggestion : suggestion.name || suggestion.villageName;
    setVillageName(name);
  };

  const getReliabilityColor = (reliability) => {
    switch (reliability?.toLowerCase()) {
      case 'high': return 'reliability-high';
      case 'medium': return 'reliability-medium';
      case 'low': return 'reliability-low';
      default: return 'reliability-low';
    }
  };

  const texts = {
    en: {
      title: 'GeoAgent',
      subtitle: 'Multi-Source AI Geocoding (Nominatim + GeoNames + OpenCage + Overpass + Wikidata + Brave + DeepSeek)',
      villageLabel: 'Village Name',
      villagePlaceholder: 'Enter village name...',
      countryLabel: 'Country (optional)',
      countryPlaceholder: 'e.g., Burkina Faso, Mali...',
      searchBtn: 'Search',
      searching: 'Searching...',
      resultTitle: 'Result',
      noResult: 'No result found for this village',
      coordinates: 'Coordinates',
      reliability: 'Reliability',
      alternatives: 'Alternative Results',
      altName: 'Name',
      altLat: 'Latitude',
      altLng: 'Longitude',
      altSource: 'Source',
      similarVillages: 'Similar Villages',
      getSuggestions: 'Get Suggestions',
      loadingSuggestions: 'Loading...',
      noSuggestions: 'No suggestions found'
    },
    fr: {
      title: 'GeoAgent',
      subtitle: 'Géocodage Multi-Sources IA (Nominatim + GeoNames + OpenCage + Overpass + Wikidata + Brave + DeepSeek)',
      villageLabel: 'Nom du Village',
      villagePlaceholder: 'Entrez le nom du village...',
      countryLabel: 'Pays (optionnel)',
      countryPlaceholder: 'ex: Burkina Faso, Mali...',
      searchBtn: 'Rechercher',
      searching: 'Recherche...',
      resultTitle: 'Résultat',
      noResult: 'Aucun résultat trouvé pour ce village',
      coordinates: 'Coordonnées',
      reliability: 'Fiabilité',
      alternatives: 'Résultats Alternatifs',
      altName: 'Nom',
      altLat: 'Latitude',
      altLng: 'Longitude',
      altSource: 'Source',
      similarVillages: 'Villages Similaires',
      getSuggestions: 'Obtenir des Suggestions',
      loadingSuggestions: 'Chargement...',
      noSuggestions: 'Aucune suggestion trouvée'
    }
  };

  const t = texts[language] || texts.en;

  return (
    <div className="geoagent-page fade-in-up">
      <div className="geoagent-container">
        
        {/* Header */}
        <header className="geoagent-header">
          <h1 className="geoagent-title">{t.title}</h1>
          <p className="geoagent-subtitle">{t.subtitle}</p>
        </header>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="geoagent-form">
          <div className="form-group">
            <label htmlFor="villageName" className="form-label">{t.villageLabel}</label>
            <input
              type="text"
              id="villageName"
              className="form-input"
              placeholder={t.villagePlaceholder}
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="country" className="form-label">{t.countryLabel}</label>
            <input
              type="text"
              id="country"
              className="form-input"
              placeholder={t.countryPlaceholder}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          
          <button type="submit" className="geoagent-search-btn" disabled={loading}>
            {loading ? t.searching : t.searchBtn}
          </button>
        </form>

        {/* Result Card */}
        {hasSearched && (
          <div className="geoagent-result-section">
            <h2 className="section-title">{t.resultTitle}</h2>
            
            {loading ? (
              <div className="result-loading">{t.searching}</div>
            ) : result?.found ? (
              <div className="result-card">
                <div className="result-header">
                  <span className="result-name">{result.villageName}</span>
                  <span className={`reliability-badge ${getReliabilityColor(result.reliability)}`}>
                    {result.reliability || 'Unknown'}
                  </span>
                </div>
                
                <div className="result-details">
                  <div className="detail-row">
                    <span className="detail-label">{t.coordinates}:</span>
                    <span className="detail-value coords">
                      {result.latitude?.toFixed(6)}, {result.longitude?.toFixed(6)}
                    </span>
                  </div>
                  
                  {result.label && (
                    <div className="detail-row">
                      <span className="detail-label">Label:</span>
                      <span className="detail-value">{result.label}</span>
                    </div>
                  )}
                </div>

                {/* Alternatives Table */}
                {result.alternatives && result.alternatives.length > 0 && (
                  <div className="alternatives-section">
                    <h3 className="alternatives-title">{t.alternatives}</h3>
                    <div className="alternatives-table-wrapper">
                      <table className="alternatives-table">
                        <thead>
                          <tr>
                            <th>{t.altName}</th>
                            <th>{t.altLat}</th>
                            <th>{t.altLng}</th>
                            <th>{t.altSource}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.alternatives.map((alt, index) => (
                            <tr key={index}>
                              <td>{alt.name || alt.villageName || '-'}</td>
                              <td>{alt.latitude?.toFixed(5) || alt.lat?.toFixed(5) || '-'}</td>
                              <td>{alt.longitude?.toFixed(5) || alt.lng?.toFixed(5) || '-'}</td>
                              <td>{alt.source || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="result-not-found">
                {t.noResult}
              </div>
            )}
          </div>
        )}

        {/* Similar Villages Section */}
        <div className="suggestions-section">
          <div className="suggestions-header">
            <h2 className="section-title">{t.similarVillages}</h2>
            <button 
              type="button" 
              className="suggestions-btn"
              onClick={handleGetSuggestions}
              disabled={suggestionsLoading || !villageName.trim()}
            >
              {suggestionsLoading ? t.loadingSuggestions : t.getSuggestions}
            </button>
          </div>
          
          {suggestions.length > 0 ? (
            <div className="suggestions-chips">
              {suggestions.map((suggestion, index) => {
                const name = typeof suggestion === 'string' ? suggestion : suggestion.name || suggestion.villageName || suggestion;
                return (
                  <button
                    key={index}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          ) : suggestionsLoading ? (
            <div className="suggestions-loading">{t.loadingSuggestions}</div>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default GeoAgent;
