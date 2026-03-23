import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import ResultsTable from '../components/ResultsTable';
import ExportOptions from '../components/ExportOptions';
import './Results.css';

const Results = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [results, setResults] = useState([]);

  // Load results from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('geocodingResults');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(parsed);
        setResults(parsed.results || []);
      } catch (error) {
        console.error('Error parsing results:', error);
      }
    }
  }, []);

  // Handle edit result
  const handleEditResult = (index, newCoords) => {
    const updatedResults = [...results];
    updatedResults[index] = {
      ...updatedResults[index],
      latitude: newCoords.latitude,
      longitude: newCoords.longitude,
      edited: true,
      found: true
    };
    setResults(updatedResults);
    
    // Update sessionStorage
    const updatedData = { ...data, results: updatedResults };
    sessionStorage.setItem('geocodingResults', JSON.stringify(updatedData));
  };

  // Handle delete result
  const handleDeleteResult = (index) => {
    const updatedResults = results.filter((_, i) => i !== index);
    setResults(updatedResults);
    
    // Update sessionStorage
    const updatedData = { ...data, results: updatedResults };
    sessionStorage.setItem('geocodingResults', JSON.stringify(updatedData));
  };

  // Handle name suggestion validation - update result with validated name
  const handleValidateNameSuggestion = (index, suggestion) => {
    const updatedResults = [...results];
    updatedResults[index] = {
      ...updatedResults[index],
      villageName: suggestion.name,
      latitude: suggestion.coordinates?.latitude || updatedResults[index].latitude,
      longitude: suggestion.coordinates?.longitude || updatedResults[index].longitude,
      validatedName: suggestion.name,
      originalName: updatedResults[index].villageName,
      edited: true,
      found: true
    };
    setResults(updatedResults);
    
    // Update sessionStorage
    const updatedData = { ...data, results: updatedResults };
    sessionStorage.setItem('geocodingResults', JSON.stringify(updatedData));
  };

  // Calculate statistics
  const stats = {
    total: results.length,
    found: results.filter(r => r.found).length,
    notFound: results.filter(r => !r.found).length,
    lowConfidence: results.filter(r => r.found && r.confidence < 0.70).length,
    successRate: results.length > 0 
      ? Math.round((results.filter(r => r.found).length / results.length) * 100) 
      : 0
  };

  if (!data || results.length === 0) {
    return (
      <div className="results-page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h2 className="empty-state-title">{t('results.empty.title')}</h2>
            <p className="empty-state-text">{t('results.empty.description')}</p>
            <Link to="/batch" className="btn btn-primary">
              {t('nav.batchGeocode')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('results.title')}</h1>
          <p className="page-subtitle">{t('results.subtitle')}</p>
        </header>

        {/* Statistics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t('results.stats.total')}</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{stats.found}</div>
            <div className="stat-label">{t('results.stats.found')}</div>
          </div>
          <div className="stat-card error">
            <div className="stat-value">{stats.notFound}</div>
            <div className="stat-label">{t('results.stats.notFound')}</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.lowConfidence}</div>
            <div className="stat-label">{t('results.stats.lowConfidence')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.successRate}%</div>
            <div className="stat-label">{t('results.stats.successRate')}</div>
          </div>
        </div>

        {/* Export Options */}
        <ExportOptions
          results={results}
          filters={data.filters}
          disabled={results.length === 0}
        />

        {/* Results Table */}
        <section className="results-section">
          <ResultsTable
            results={results}
            onEditResult={handleEditResult}
            onDeleteResult={handleDeleteResult}
            onValidateNameSuggestion={handleValidateNameSuggestion}
          />
        </section>

        {/* Actions */}
        <div className="results-actions">
          <Link to="/batch" className="btn btn-secondary">
            ← {t('common.back')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Results;
