import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdvancedSearchResults.css';

const SOURCE_ICONS = {
  nominatim: { icon: 'N', label: 'Nominatim (OSM)', cls: 'source-nominatim' },
  geonames:  { icon: 'G', label: 'GeoNames',        cls: 'source-geonames' },
  opencage:  { icon: 'O', label: 'OpenCage',         cls: 'source-opencage' },
  google:    { icon: 'G', label: 'Google Maps',      cls: 'source-google' },
  photon:    { icon: 'P', label: 'Photon (Komoot)',  cls: 'source-photon' },
};

export default function AdvancedSearchResults() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('advancedSearchResults');
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      // Expand all sources by default
      const expanded = {};
      (parsed.sourceResults || []).forEach(s => { expanded[s.sourceKey] = true; });
      setExpandedSources(expanded);
    } else {
      navigate('/search');
    }
  }, [navigate]);

  if (!data) return (
    <div className="advanced-results-page">
      <div style={{textAlign:'center', padding:'60px', color:'#666'}}>Chargement des résultats...</div>
    </div>
  );

  const totalResults = (data.sourceResults || []).reduce((acc, s) => acc + (s.results?.length || 0), 0);
  const sourcesWithResults = (data.sourceResults || []).filter(s => s.results?.length > 0).length;
  const sourcesWithErrors = (data.sourceResults || []).filter(s => s.error).length;

  const toggleSource = (key) => {
    setExpandedSources(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectResult = (result, sourceName) => {
    setSelectedResult({ ...result, sourceName });
  };

  const handleConfirmSelection = () => {
    sessionStorage.setItem('selectedGeoResult', JSON.stringify(selectedResult));
    navigate('/search', { state: { selectedResult } });
  };

  const ai = data.aiRecommendations;

  return (
    <div className="advanced-results-page">
      {/* Header */}
      <div className="advanced-results-header">
        <div>
          <h1>🔍 Résultats — Recherche Avancée</h1>
          <div className="search-meta">
            <span>📍 Village : <strong>{data.villageName}</strong></span>
            <span>📏 Rayon : <strong>{data.radiusKm} km</strong></span>
            <span>🌐 Centre : {data.center?.lat?.toFixed(4)}, {data.center?.lng?.toFixed(4)}</span>
            <span>🕐 {new Date(data.searchedAt).toLocaleTimeString('fr-FR')}</span>
          </div>
        </div>
        <button className="btn-back" onClick={() => navigate('/search')}>
          ← Retour à la recherche
        </button>
      </div>

      {/* Summary bar */}
      <div className="results-summary-bar">
        <div className="summary-card">
          <div className="number">{totalResults}</div>
          <div className="label">Résultats totaux</div>
        </div>
        <div className="summary-card">
          <div className="number">{sourcesWithResults}</div>
          <div className="label">Sources actives</div>
        </div>
        <div className="summary-card">
          <div className="number">{(data.sourceResults || []).length}</div>
          <div className="label">Sources interrogées</div>
        </div>
        <div className="summary-card">
          <div className="number">{data.similarNames?.length || 0}</div>
          <div className="label">Noms similaires</div>
        </div>
        {sourcesWithErrors > 0 && (
          <div className="summary-card" style={{borderTopColor:'#f44336'}}>
            <div className="number" style={{color:'#f44336'}}>{sourcesWithErrors}</div>
            <div className="label">Sources en erreur</div>
          </div>
        )}
      </div>

      {/* AI Recommendations */}
      {ai && (
        <div className="ai-recommendations-panel">
          <h2>🤖 Recommandations IA (DeepSeek)</h2>
          <div className="ai-rec-grid">
            {ai.bestMatch && (
              <div className="ai-rec-item">
                <label>Meilleur résultat suggéré</label>
                <div className="value">{ai.bestMatch}</div>
              </div>
            )}
            {ai.confidence && (
              <div className="ai-rec-item">
                <label>Niveau de confiance</label>
                <div className="value">
                  <span className={`confidence-badge confidence-${ai.confidence}`}>
                    {ai.confidence === 'haute' ? '✅ Haute' : ai.confidence === 'moyenne' ? '⚠️ Moyenne' : '❌ Faible'}
                  </span>
                </div>
              </div>
            )}
            {ai.reasoning && (
              <div className="ai-rec-item" style={{gridColumn: 'span 2'}}>
                <label>Analyse</label>
                <div className="value" style={{fontSize:'0.9rem', fontWeight:'normal', color:'#333'}}>{ai.reasoning}</div>
              </div>
            )}
            {ai.alternativeNames?.length > 0 && (
              <div className="ai-rec-item" style={{gridColumn: 'span 2'}}>
                <label>Noms alternatifs suggérés par l'IA</label>
                <div className="alt-names">
                  {ai.alternativeNames.map((n, i) => (
                    <span key={i} className="alt-name-tag">{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {ai.tips && (
            <div className="ai-tips">💡 <strong>Conseil :</strong> {ai.tips}</div>
          )}
        </div>
      )}

      {/* Similar names across all sources */}
      {data.similarNames?.length > 0 && (
        <div className="similar-names-section">
          <h3>🔤 Noms similaires trouvés dans toutes les sources</h3>
          <div className="alt-names">
            {data.similarNames.map((n, i) => (
              <span key={i} className="alt-name-tag">{n}</span>
            ))}
          </div>
        </div>
      )}

      {/* Per-source results */}
      <div className="sources-container">
        {(data.sourceResults || []).map((sourceData) => {
          const meta = SOURCE_ICONS[sourceData.sourceKey] || { icon: '?', label: sourceData.source, cls: 'source-nominatim' };
          const isExpanded = expandedSources[sourceData.sourceKey];
          const hasResults = sourceData.results?.length > 0;
          const hasError = !!sourceData.error;

          return (
            <div key={sourceData.sourceKey} className="source-section">
              <div className="source-header" onClick={() => toggleSource(sourceData.sourceKey)}>
                <div className="source-header-left">
                  <div className={`source-icon ${meta.cls}`}>{meta.icon}</div>
                  <div>
                    <div className="source-name">{sourceData.source}</div>
                    <div className="source-count">
                      {hasError ? 'Erreur de connexion' : `${sourceData.results?.length || 0} résultat(s) dans le rayon de ${data.radiusKm} km`}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <span className={`source-status-badge ${hasError ? 'status-error' : hasResults ? 'status-ok' : 'status-empty'}`}>
                    {hasError ? '⚠ Erreur' : hasResults ? `✓ ${sourceData.results.length} résultat(s)` : '○ Aucun résultat'}
                  </span>
                  <span style={{color:'#999', fontSize:'1.2rem'}}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="source-body">
                  {hasError && (
                    <div className="source-error-msg">
                      ⚠ Erreur : {sourceData.error}
                    </div>
                  )}
                  {!hasError && !hasResults && (
                    <div className="source-empty-msg">
                      Aucun résultat trouvé dans un rayon de {data.radiusKm} km pour "{data.villageName}"
                    </div>
                  )}
                  {hasResults && (
                    <div className="results-table-wrapper">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Nom</th>
                            <th>Distance</th>
                            <th>Similarité</th>
                            <th>Type</th>
                            <th>Coordonnées</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sourceData.results.map((r, idx) => {
                            const isSelected = selectedResult?.name === r.name && selectedResult?.sourceName === sourceData.source;
                            return (
                              <tr key={idx}>
                                <td style={{color:'#999', fontSize:'0.8rem'}}>{idx + 1}</td>
                                <td>
                                  <div className="result-name">{r.name}</div>
                                  {r.displayName && r.displayName !== r.name && (
                                    <div className="result-display-name">{r.displayName}</div>
                                  )}
                                </td>
                                <td>
                                  <span className="distance-badge">📍 {r.distance} km</span>
                                </td>
                                <td>
                                  <div className="similarity-bar-wrap">
                                    <div className="similarity-bar">
                                      <div className="similarity-fill" style={{width: `${Math.round((r.similarity||0)*100)}%`}} />
                                    </div>
                                    <span className="similarity-pct">{Math.round((r.similarity||0)*100)}%</span>
                                  </div>
                                </td>
                                <td style={{color:'#666', fontSize:'0.82rem'}}>{r.type || '—'}</td>
                                <td style={{fontSize:'0.8rem', color:'#888', fontFamily:'monospace'}}>
                                  {r.lat?.toFixed(5)}, {r.lng?.toFixed(5)}
                                </td>
                                <td>
                                  <button
                                    className={`btn-select ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSelectResult(r, sourceData.source)}
                                  >
                                    {isSelected ? '✓ Sélectionné' : 'Choisir'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected result floating panel */}
      {selectedResult && (
        <div className="selected-result-panel">
          <h4>✅ Résultat sélectionné</h4>
          <div className="result-info">
            <strong>{selectedResult.name}</strong><br/>
            <span style={{color:'#666', fontSize:'0.82rem'}}>{selectedResult.displayName}</span><br/>
            <span style={{color:'#1565c0', fontSize:'0.82rem'}}>Source : {selectedResult.sourceName}</span><br/>
            <span style={{color:'#555', fontSize:'0.82rem'}}>
              📍 {selectedResult.distance} km · {selectedResult.lat?.toFixed(5)}, {selectedResult.lng?.toFixed(5)}
            </span>
          </div>
          <button className="btn-confirm" onClick={handleConfirmSelection}>
            Confirmer ce résultat
          </button>
          <button className="btn-dismiss" onClick={() => setSelectedResult(null)}>
            Annuler la sélection
          </button>
        </div>
      )}
    </div>
  );
}
