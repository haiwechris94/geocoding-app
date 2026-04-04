import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { aiAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ResultsTable.css';

const ResultsTable = ({ results, onEditResult, onDeleteResult, onValidateNameSuggestion, language: langProp }) => {
  const { t, language: ctxLanguage } = useLanguage();
  const language = langProp || ctxLanguage;
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ latitude: '', longitude: '' });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [validatedNames, setValidatedNames] = useState({});
  const [comments, setComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchComment = async (result, index) => {
    if (loadingComments[index] || comments[index]) return;
    setLoadingComments(prev => ({ ...prev, [index]: true }));
    try {
      const resp = await fetch(`${API_BASE}/geocoding/village-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': language },
        body: JSON.stringify({
          villageName: result.villageName,
          country: result.country || result.filters?.country || result.formattedAddress?.split(',').slice(-1)[0]?.trim() || '',
          latitude: result.latitude,
          longitude: result.longitude,
          lang: language,
        }),
      });
      const data = await resp.json();
      if (data.success && data.comment) {
        setComments(prev => ({ ...prev, [index]: data.comment }));
      } else {
        setComments(prev => ({ ...prev, [index]: '__error__' }));
      }
    } catch (e) {
      setComments(prev => ({ ...prev, [index]: '__error__' }));
    } finally {
      setLoadingComments(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = React.useMemo(() => {
    if (!sortConfig.key) return results;
    
    return [...results].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortConfig]);

  const startEdit = (result, index) => {
    setEditingId(index);
    setEditValues({
      latitude: result.latitude || '',
      longitude: result.longitude || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ latitude: '', longitude: '' });
  };

  const saveEdit = (index) => {
    const lat = parseFloat(editValues.latitude);
    const lng = parseFloat(editValues.longitude);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onEditResult(index, { latitude: lat, longitude: lng });
      setEditingId(null);
    }
  };

  const handleViewOnMap = (result) => {
    if (!result.latitude || !result.longitude) {
      alert(t('results.invalidCoordinates'));
      return;
    }
    const lat = result.latitude;
    const lon = result.longitude;
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
    window.open(url, '_blank');
  };

  const getConfidenceClass = (confidence) => {
    if (!confidence) return '';
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.70) return 'medium';
    return 'low';
  };

  const getStatusBadge = (result) => {
    if (!result.found) {
      return <span className="status-badge not-found">{t('results.status.notFound')}</span>;
    }
    if (result.edited) {
      return <span className="status-badge edited">{t('results.status.edited')}</span>;
    }
    if (result.confidence < 0.70) {
      return <span className="status-badge low-confidence">{t('results.status.lowConfidence')}</span>;
    }
    return <span className="status-badge found">{t('results.status.found')}</span>;
  };

  const toggleRowExpansion = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleValidateName = (resultIndex, suggestion, isValid) => {
    const key = `${resultIndex}-${suggestion.name}`;
    setValidatedNames(prev => ({
      ...prev,
      [key]: isValid
    }));
    
    if (isValid && onValidateNameSuggestion) {
      onValidateNameSuggestion(resultIndex, suggestion);
      toast.success(
        language === 'fr' 
          ? `Nom "${suggestion.name}" validé et appliqué` 
          : `Name "${suggestion.name}" validated and applied`
      );
    } else if (!isValid) {
      toast.info(
        language === 'fr' 
          ? `Nom "${suggestion.name}" marqué comme invalide` 
          : `Name "${suggestion.name}" marked as invalid`
      );
    }
  };

  const getValidationStatus = (resultIndex, suggestionName) => {
    const key = `${resultIndex}-${suggestionName}`;
    return validatedNames[key];
  };

  // Extract country from formatted address
  const getCountryOrAddress = (result) => {
    if (result.formattedAddressDisplay) {
      return result.formattedAddressDisplay;
    }
    if (result.formattedAddress) {
      return result.formattedAddress;
    }
    // Try to extract country from filters
    if (result.filters?.country) {
      return result.filters.country;
    }
    return '-';
  };

  // Render confidence details breakdown
  const renderConfidenceDetails = (result, index) => {
    const details = result.confidenceDetails;
    if (!details || !details.breakdown) return null;

    const { breakdown } = details;
    
    return (
      <div className="confidence-details">
        <h4>
          {language === 'fr' ? '📊 Détails de Confiance' : '📊 Confidence Details'}
        </h4>
        <div className="confidence-breakdown">
          {/* Source Reliability */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">
                {language === 'fr' ? 'Fiabilité de la Source' : 'Source Reliability'}
              </span>
              <span className="breakdown-score">{Math.round(breakdown.sourceReliability.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.sourceReliability.score)}`}
                style={{ width: `${breakdown.sourceReliability.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {language === 'fr' 
                ? breakdown.sourceReliability.explanation.fr 
                : breakdown.sourceReliability.explanation.en}
            </p>
          </div>

          {/* Name Similarity */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">
                {language === 'fr' ? 'Similarité du Nom' : 'Name Similarity'}
              </span>
              <span className="breakdown-score">{Math.round(breakdown.nameSimilarity.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.nameSimilarity.score)}`}
                style={{ width: `${breakdown.nameSimilarity.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {language === 'fr' 
                ? breakdown.nameSimilarity.explanation.fr 
                : breakdown.nameSimilarity.explanation.en}
            </p>
            {breakdown.nameSimilarity.originalName !== breakdown.nameSimilarity.foundName && (
              <div className="name-comparison">
                <span>
                  {language === 'fr' ? 'Recherché: ' : 'Searched: '}
                  <strong>{breakdown.nameSimilarity.originalName}</strong>
                </span>
                <span>→</span>
                <span>
                  {language === 'fr' ? 'Trouvé: ' : 'Found: '}
                  <strong>{breakdown.nameSimilarity.foundName}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Geographic Proximity */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">
                {language === 'fr' ? 'Proximité Géographique' : 'Geographic Proximity'}
              </span>
              <span className="breakdown-score">{Math.round(breakdown.geographicProximity.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.geographicProximity.score)}`}
                style={{ width: `${breakdown.geographicProximity.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {language === 'fr' 
                ? breakdown.geographicProximity.explanation.fr 
                : breakdown.geographicProximity.explanation.en}
            </p>
          </div>

          {/* Result Consistency */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">
                {language === 'fr' ? 'Cohérence des Résultats' : 'Result Consistency'}
              </span>
              <span className="breakdown-score">{Math.round(breakdown.resultConsistency.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.resultConsistency.score)}`}
                style={{ width: `${breakdown.resultConsistency.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {language === 'fr' 
                ? breakdown.resultConsistency.explanation.fr 
                : breakdown.resultConsistency.explanation.en}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render name suggestions with validation buttons
  const renderNameSuggestions = (result, index) => {
    if (!result.nameSuggestions || result.nameSuggestions.length === 0) return null;

    return (
      <div className="name-suggestions">
        <h4>
          {language === 'fr' ? '💡 Noms Alternatifs Suggérés' : '💡 Suggested Alternative Names'}
        </h4>
        <p className="suggestions-hint">
          {language === 'fr' 
            ? 'Cliquez pour valider ou invalider chaque suggestion:' 
            : 'Click to validate or invalidate each suggestion:'}
        </p>
        <div className="suggestions-list">
          {result.nameSuggestions.map((suggestion, suggIdx) => {
            const validationStatus = getValidationStatus(index, suggestion.name);
            return (
              <div 
                key={suggIdx} 
                className={`suggestion-item ${validationStatus === true ? 'validated' : validationStatus === false ? 'invalidated' : ''}`}
              >
                <div className="suggestion-info">
                  <span className="suggestion-name">{suggestion.name}</span>
                  <span className="suggestion-similarity">
                    {Math.round(suggestion.similarity * 100)}% {language === 'fr' ? 'similaire' : 'similar'}
                  </span>
                  <span className="suggestion-source">
                    {language === 'fr' ? 'Source: ' : 'Source: '}{suggestion.source}
                  </span>
                  {suggestion.coordinates && (
                    <span className="suggestion-coords">
                      📍 {suggestion.coordinates.latitude.toFixed(4)}, {suggestion.coordinates.longitude.toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="suggestion-actions">
                  {validationStatus === undefined ? (
                    <>
                      <button 
                        className="validate-btn valid"
                        onClick={() => handleValidateName(index, suggestion, true)}
                        title={language === 'fr' ? 'Valider ce nom' : 'Validate this name'}
                      >
                        ✓ {language === 'fr' ? 'Valider' : 'Validate'}
                      </button>
                      <button 
                        className="validate-btn invalid"
                        onClick={() => handleValidateName(index, suggestion, false)}
                        title={language === 'fr' ? 'Invalider ce nom' : 'Invalidate this name'}
                      >
                        ✕ {language === 'fr' ? 'Invalider' : 'Invalidate'}
                      </button>
                    </>
                  ) : (
                    <span className={`validation-status ${validationStatus ? 'valid' : 'invalid'}`}>
                      {validationStatus 
                        ? (language === 'fr' ? '✓ Validé' : '✓ Validated')
                        : (language === 'fr' ? '✕ Invalidé' : '✕ Invalidated')
                      }
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!results || results.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3 className="empty-state-title">{t('results.empty.title')}</h3>
        <p className="empty-state-text">{t('results.empty.description')}</p>
      </div>
    );
  }

  // Check if any result needs expanded details
  const hasExpandableContent = (result) => {
    return result.found ||
           (result.confidence && result.confidence < 1) ||
           (result.nameSuggestions && result.nameSuggestions.length > 0);
  };

  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th className="expand-col"></th>
            <th onClick={() => handleSort('villageName')} className="sortable">
              {t('results.table.villageName')}
              {sortConfig.key === 'villageName' && (
                <span className="sort-icon">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th>
              {language === 'fr' ? 'Pays / Adresse' : 'Country / Address'}
            </th>
            <th onClick={() => handleSort('latitude')} className="sortable">
              {t('results.table.latitude')}
            </th>
            <th onClick={() => handleSort('longitude')} className="sortable">
              {t('results.table.longitude')}
            </th>
            <th>{t('results.table.source')}</th>
            <th onClick={() => handleSort('confidence')} className="sortable">
              {t('results.table.confidence')}
            </th>
            <th>{t('results.table.status')}</th>
            <th>{t('results.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((result, index) => (
            <React.Fragment key={index}>
              <tr className={`${!result.found ? 'not-found-row' : ''} ${expandedRows.has(index) ? 'expanded' : ''}`}>
                <td className="expand-col">
                  {hasExpandableContent(result) && (
                    <button 
                      className="expand-btn"
                      onClick={() => toggleRowExpansion(index)}
                      title={language === 'fr' ? 'Voir les détails' : 'View details'}
                    >
                      {expandedRows.has(index) ? '▼' : '▶'}
                    </button>
                  )}
                </td>
                <td className="village-name">{result.villageName}</td>
                <td className="address-cell">
                  <span className="address-text" title={getCountryOrAddress(result)}>
                    {getCountryOrAddress(result)}
                  </span>
                </td>
                <td>
                  {editingId === index ? (
                    <input
                      type="number"
                      step="0.0001"
                      value={editValues.latitude}
                      onChange={(e) => setEditValues({ ...editValues, latitude: e.target.value })}
                      className="edit-input"
                    />
                  ) : (
                    result.latitude?.toFixed(4) || '-'
                  )}
                </td>
                <td>
                  {editingId === index ? (
                    <input
                      type="number"
                      step="0.0001"
                      value={editValues.longitude}
                      onChange={(e) => setEditValues({ ...editValues, longitude: e.target.value })}
                      className="edit-input"
                    />
                  ) : (
                    result.longitude?.toFixed(4) || '-'
                  )}
                </td>
                <td>{result.source || '-'}</td>
                <td>
                  {result.confidence ? (
                    <span 
                      className={`confidence-badge ${getConfidenceClass(result.confidence)} ${result.confidence < 1 ? 'clickable' : ''}`}
                      onClick={() => result.confidence < 1 && toggleRowExpansion(index)}
                      title={result.confidence < 1 ? (language === 'fr' ? 'Cliquez pour voir les raisons' : 'Click to see reasons') : ''}
                    >
                      {Math.round(result.confidence * 100)}%
                      {result.confidence < 1 && <span className="info-icon">ℹ️</span>}
                    </span>
                  ) : '-'}
                </td>
                <td>{getStatusBadge(result)}</td>
                <td>
                  <div className="action-buttons">
                    {editingId === index ? (
                      <>
                        <button className="action-btn save" onClick={() => saveEdit(index)}>✓</button>
                        <button className="action-btn cancel" onClick={cancelEdit}>✕</button>
                      </>
                    ) : (
                      <>
                        <button className="action-btn edit" onClick={() => startEdit(result, index)} title={t('common.edit')}>✎</button>
                        <button 
                          className="action-btn view-map" 
                          onClick={() => handleViewOnMap(result)}
                          disabled={!result.latitude || !result.longitude}
                          title="OpenStreetMap"
                        >
                          🗺️
                        </button>
                        {onDeleteResult && (
                          <button className="action-btn delete" onClick={() => onDeleteResult(index)} title={t('common.delete')}>🗑</button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {/* Expanded row for confidence details, name suggestions and AI comment */}
              {expandedRows.has(index) && hasExpandableContent(result) && (
                <tr className="expanded-row">
                  <td colSpan="9">
                    <div className="expanded-content">
                      {result.confidence < 1 && result.confidenceDetails && renderConfidenceDetails(result, index)}
                      {result.nameSuggestions && result.nameSuggestions.length > 0 && renderNameSuggestions(result, index)}

                      {/* AI Comment Section */}
                      {result.found && (
                        <div className="ai-comment-section">
                          <h4 className="ai-comment-title">
                            🤖 {language === 'fr' ? 'Commentaire IA' : 'AI Comment'}
                          </h4>
                          {result.comment || comments[index] ? (
                            <p className="ai-comment-text">
                              💬 {result.comment || comments[index] === '__error__'
                                ? (language === 'fr' ? '⚠️ Impossible de générer un commentaire' : '⚠️ Unable to generate comment')
                                : comments[index]}
                            </p>
                          ) : loadingComments[index] ? (
                            <div className="ai-comment-loading">
                              <span className="ai-spinner" />
                              {language === 'fr' ? 'Brave Search + DeepSeek en cours d\'analyse...' : 'Brave Search + DeepSeek analysing...'}
                            </div>
                          ) : (
                            <button
                              className="ai-comment-btn"
                              onClick={() => fetchComment(result, index)}
                            >
                              🤖 {language === 'fr' ? 'Générer un commentaire IA' : 'Generate AI comment'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;