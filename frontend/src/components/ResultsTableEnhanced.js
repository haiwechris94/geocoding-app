import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { aiAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ResultsTable.css';

/**
 * Enhanced Results Table with Confidence Details and AI Features
 * Tableau de résultats amélioré avec détails de confiance et fonctionnalités IA
 */
const ResultsTableEnhanced = ({ results, onEditResult, onDeleteResult, onUseNameSuggestion }) => {
  const { t, language } = useLanguage();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ latitude: '', longitude: '' });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [aiLoading, setAiLoading] = useState({});
  const [aiExplanations, setAiExplanations] = useState({});

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
      toast.warning(t('results.invalidCoordinates'));
      return;
    }
    const lat = result.latitude;
    const lon = result.longitude;
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
    window.open(url, '_blank');
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

  const handleAskAI = async (result, index) => {
    if (!result.confidenceDetails) {
      toast.warning(t('ai.error'));
      return;
    }

    setAiLoading(prev => ({ ...prev, [index]: true }));

    try {
      const response = await aiAPI.explainConfidence(
        result.confidenceDetails,
        result.villageName
      );

      if (response.success) {
        setAiExplanations(prev => ({ ...prev, [index]: response.data }));
        setExpandedRows(prev => new Set([...prev, index]));
        toast.success(t('ai.recommendations'));
      }
    } catch (error) {
      console.error('AI explanation error:', error);
      toast.error(t('ai.error'));
    } finally {
      setAiLoading(prev => ({ ...prev, [index]: false }));
    }
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

  const renderConfidenceDetails = (result) => {
    if (!result.confidenceDetails || !result.confidenceDetails.breakdown) return null;

    const { breakdown } = result.confidenceDetails;
    const lang = language === 'fr' ? 'fr' : 'en';

    return (
      <div className="confidence-details">
        <h4>{t('confidenceDetails.title')}</h4>
        
        <div className="confidence-breakdown">
          {/* Source Reliability */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">{t('confidenceDetails.sourceReliability')}</span>
              <span className="breakdown-score">{Math.round(breakdown.sourceReliability.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.sourceReliability.score)}`}
                style={{ width: `${breakdown.sourceReliability.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {breakdown.sourceReliability.explanation[lang]}
            </p>
          </div>

          {/* Name Similarity */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">{t('confidenceDetails.nameSimilarity')}</span>
              <span className="breakdown-score">{Math.round(breakdown.nameSimilarity.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.nameSimilarity.score)}`}
                style={{ width: `${breakdown.nameSimilarity.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {breakdown.nameSimilarity.explanation[lang]}
            </p>
            <div className="name-comparison">
              <span><strong>{t('confidenceDetails.originalName')}:</strong> {breakdown.nameSimilarity.originalName}</span>
              <span><strong>{t('confidenceDetails.foundName')}:</strong> {breakdown.nameSimilarity.foundName}</span>
            </div>
          </div>

          {/* Geographic Proximity */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">{t('confidenceDetails.geographicProximity')}</span>
              <span className="breakdown-score">{Math.round(breakdown.geographicProximity.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.geographicProximity.score)}`}
                style={{ width: `${breakdown.geographicProximity.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {breakdown.geographicProximity.explanation[lang]}
            </p>
          </div>

          {/* Result Consistency */}
          <div className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-label">{t('confidenceDetails.resultConsistency')}</span>
              <span className="breakdown-score">{Math.round(breakdown.resultConsistency.score * 100)}%</span>
            </div>
            <div className="breakdown-bar">
              <div 
                className={`breakdown-fill ${getConfidenceClass(breakdown.resultConsistency.score)}`}
                style={{ width: `${breakdown.resultConsistency.score * 100}%` }}
              />
            </div>
            <p className="breakdown-explanation">
              {breakdown.resultConsistency.explanation[lang]}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderNameSuggestions = (result, index) => {
    if (!result.nameSuggestions || result.nameSuggestions.length === 0) return null;

    return (
      <div className="name-suggestions">
        <h4>{t('nameSuggestions.title')}</h4>
        <div className="suggestions-list">
          {result.nameSuggestions.map((suggestion, idx) => (
            <div key={idx} className="suggestion-item">
              <div className="suggestion-info">
                <span className="suggestion-name">{suggestion.name}</span>
                <span className="suggestion-similarity">
                  {t('nameSuggestions.similarity')}: {Math.round(suggestion.similarity * 100)}%
                </span>
                <span className="suggestion-source">
                  {t('nameSuggestions.source')}: {suggestion.source}
                </span>
              </div>
              {onUseNameSuggestion && (
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => onUseNameSuggestion(index, suggestion)}
                >
                  {t('nameSuggestions.useThis')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAIExplanation = (index) => {
    const explanation = aiExplanations[index];
    if (!explanation) return null;

    return (
      <div className="ai-explanation">
        <h4>🤖 {t('ai.confidenceExplanation')}</h4>
        <p className="ai-explanation-text">{explanation.explanation}</p>
        
        {explanation.recommendations && explanation.recommendations.length > 0 && (
          <div className="ai-recommendations">
            <h5>{t('ai.tips')}</h5>
            <ul>
              {explanation.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        {explanation.shouldVerify && (
          <div className="ai-warning">
            ⚠️ {language === 'fr' 
              ? 'Ce résultat devrait être vérifié manuellement.' 
              : 'This result should be manually verified.'}
          </div>
        )}
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

  return (
    <div className="results-table-container enhanced">
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
                  {(result.confidenceDetails || result.nameSuggestions) && (
                    <button 
                      className="expand-btn"
                      onClick={() => toggleRowExpansion(index)}
                      title={expandedRows.has(index) ? t('ai.hideDetails') : t('ai.viewDetails')}
                    >
                      {expandedRows.has(index) ? '▼' : '▶'}
                    </button>
                  )}
                </td>
                <td className="village-name">{result.villageName}</td>
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
                    <span className={`confidence-badge ${getConfidenceClass(result.confidence)}`}>
                      {Math.round(result.confidence * 100)}%
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
                          title={t('results.viewOnMap')}
                        >
                          🗺️
                        </button>
                        {result.confidence < 0.70 && result.confidenceDetails && (
                          <button 
                            className="action-btn ai-btn"
                            onClick={() => handleAskAI(result, index)}
                            disabled={aiLoading[index]}
                            title={t('ai.askAI')}
                          >
                            {aiLoading[index] ? '⏳' : '🤖'}
                          </button>
                        )}
                        {onDeleteResult && (
                          <button className="action-btn delete" onClick={() => onDeleteResult(index)} title={t('common.delete')}>🗑</button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {expandedRows.has(index) && (
                <tr className="expanded-row">
                  <td colSpan="8">
                    <div className="expanded-content">
                      {renderConfidenceDetails(result)}
                      {renderNameSuggestions(result, index)}
                      {renderAIExplanation(index)}
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

export default ResultsTableEnhanced;
