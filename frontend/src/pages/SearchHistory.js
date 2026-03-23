import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { searchHistoryAPI } from '../services/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import './SearchHistory.css';

const SearchHistory = () => {
  const { language } = useLanguage();
  
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    query: '',
    type: '',
    found: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    loadHistory();
    loadStats();
  }, [pagination.page, filters]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await searchHistoryAPI.getHistory({
        page: pagination.page,
        limit: 20,
        ...filters,
        found: filters.found === '' ? undefined : filters.found === 'true'
      });
      
      if (response.success) {
        setHistory(response.data.data);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur lors du chargement de l\'historique'
          : 'Error loading history'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await searchHistoryAPI.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleGetAIInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const response = await searchHistoryAPI.getAIInsights();
      if (response.success) {
        setAiInsights(response.data);
        toast.success(
          language === 'fr'
            ? 'Insights IA générés!'
            : 'AI insights generated!'
        );
      }
    } catch (error) {
      console.error('Error getting AI insights:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur lors de la génération des insights'
          : 'Error generating insights'
      );
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm(
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir supprimer cette entrée?'
        : 'Are you sure you want to delete this entry?'
    )) {
      return;
    }

    try {
      const response = await searchHistoryAPI.deleteEntry(id);
      if (response.success) {
        setHistory(prev => prev.filter(h => h.id !== id));
        toast.success(
          language === 'fr'
            ? 'Entrée supprimée'
            : 'Entry deleted'
        );
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur lors de la suppression'
          : 'Error deleting entry'
      );
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir effacer tout l\'historique?'
        : 'Are you sure you want to clear all history?'
    )) {
      return;
    }

    try {
      const response = await searchHistoryAPI.clearAll();
      if (response.success) {
        setHistory([]);
        setStats(null);
        setAiInsights(null);
        toast.success(
          language === 'fr'
            ? 'Historique effacé'
            : 'History cleared'
        );
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur lors de l\'effacement'
          : 'Error clearing history'
      );
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await searchHistoryAPI.exportHistory(format);
      
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `search_history_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // JSON download
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `search_history_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      toast.success(
        language === 'fr'
          ? 'Exportation réussie!'
          : 'Export successful!'
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(
        language === 'fr'
          ? 'Erreur lors de l\'exportation'
          : 'Error exporting'
      );
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return language === 'fr'
      ? date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };

  const getTypeLabel = (type) => {
    const labels = {
      single: { en: 'Single', fr: 'Simple' },
      batch: { en: 'Batch', fr: 'Lots' },
      area: { en: 'Area', fr: 'Zone' }
    };
    return labels[type]?.[language] || type;
  };

  return (
    <div className="search-history-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">
            {language === 'fr' ? '📜 Historique de Recherche' : '📜 Search History'}
          </h1>
          <p className="page-subtitle">
            {language === 'fr'
              ? 'Consultez et analysez vos recherches passées'
              : 'View and analyze your past searches'}
          </p>
        </header>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            {language === 'fr' ? '📋 Historique' : '📋 History'}
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            {language === 'fr' ? '📊 Statistiques' : '📊 Statistics'}
          </button>
          <button
            className={`tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            {language === 'fr' ? '🤖 Insights IA' : '🤖 AI Insights'}
          </button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-tab">
            {/* Filters */}
            <div className="history-filters">
              <input
                type="text"
                placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="filter-input"
              />
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="filter-select"
              >
                <option value="">{language === 'fr' ? 'Tous les types' : 'All types'}</option>
                <option value="single">{language === 'fr' ? 'Simple' : 'Single'}</option>
                <option value="batch">{language === 'fr' ? 'Lots' : 'Batch'}</option>
                <option value="area">{language === 'fr' ? 'Zone' : 'Area'}</option>
              </select>
              <select
                value={filters.found}
                onChange={(e) => setFilters(prev => ({ ...prev, found: e.target.value }))}
                className="filter-select"
              >
                <option value="">{language === 'fr' ? 'Tous les résultats' : 'All results'}</option>
                <option value="true">{language === 'fr' ? 'Trouvés' : 'Found'}</option>
                <option value="false">{language === 'fr' ? 'Non trouvés' : 'Not found'}</option>
              </select>
            </div>

            {/* Actions */}
            <div className="history-actions">
              <button className="btn btn-outline" onClick={() => handleExport('csv')}>
                📄 {language === 'fr' ? 'Exporter CSV' : 'Export CSV'}
              </button>
              <button className="btn btn-outline" onClick={() => handleExport('json')}>
                📋 {language === 'fr' ? 'Exporter JSON' : 'Export JSON'}
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                🗑️ {language === 'fr' ? 'Effacer Tout' : 'Clear All'}
              </button>
            </div>

            {/* History Table */}
            {isLoading ? (
              <LoadingSpinner message={language === 'fr' ? 'Chargement...' : 'Loading...'} />
            ) : history.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>
                  {language === 'fr'
                    ? 'Aucun historique de recherche'
                    : 'No search history'}
                </p>
              </div>
            ) : (
              <>
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>{language === 'fr' ? 'Date' : 'Date'}</th>
                        <th>{language === 'fr' ? 'Requête' : 'Query'}</th>
                        <th>{language === 'fr' ? 'Type' : 'Type'}</th>
                        <th>{language === 'fr' ? 'Statut' : 'Status'}</th>
                        <th>{language === 'fr' ? 'Confiance' : 'Confidence'}</th>
                        <th>{language === 'fr' ? 'Actions' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry) => (
                        <tr key={entry.id}>
                          <td className="date-cell">{formatDate(entry.timestamp)}</td>
                          <td className="query-cell">{entry.query}</td>
                          <td>
                            <span className={`type-badge ${entry.type}`}>
                              {getTypeLabel(entry.type)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${entry.result?.found ? 'found' : 'not-found'}`}>
                              {entry.result?.found
                                ? (language === 'fr' ? 'Trouvé' : 'Found')
                                : (language === 'fr' ? 'Non trouvé' : 'Not found')}
                            </span>
                          </td>
                          <td>
                            {entry.result?.confidence
                              ? `${Math.round(entry.result.confidence * 100)}%`
                              : '-'}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="pagination">
                  <button
                    className="btn btn-sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </button>
                  <span className="page-info">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    {language === 'fr' ? 'Suivant' : 'Next'} →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="stats-tab">
            {stats ? (
              <>
                {/* Overview Stats */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{stats.totalSearches}</span>
                    <span className="stat-label">
                      {language === 'fr' ? 'Total Recherches' : 'Total Searches'}
                    </span>
                  </div>
                  <div className="stat-card success">
                    <span className="stat-value">{stats.successRate}%</span>
                    <span className="stat-label">
                      {language === 'fr' ? 'Taux de Réussite' : 'Success Rate'}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{stats.averageConfidence}%</span>
                    <span className="stat-label">
                      {language === 'fr' ? 'Confiance Moyenne' : 'Avg Confidence'}
                    </span>
                  </div>
                </div>

                {/* Most Searched */}
                {stats.mostSearchedLocations && stats.mostSearchedLocations.length > 0 && (
                  <div className="stats-section">
                    <h3>{language === 'fr' ? '🔥 Plus Recherchés' : '🔥 Most Searched'}</h3>
                    <div className="top-searches">
                      {stats.mostSearchedLocations.map((loc, idx) => (
                        <div key={idx} className="top-search-item">
                          <span className="rank">#{idx + 1}</span>
                          <span className="name">{loc.name}</span>
                          <span className="count">{loc.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Searches by Type */}
                {stats.searchesByType && (
                  <div className="stats-section">
                    <h3>{language === 'fr' ? '📊 Par Type' : '📊 By Type'}</h3>
                    <div className="type-stats">
                      {Object.entries(stats.searchesByType).map(([type, count]) => (
                        <div key={type} className="type-stat-item">
                          <span className="type-name">{getTypeLabel(type)}</span>
                          <span className="type-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trends */}
                {stats.recentTrends && (
                  <div className="stats-section">
                    <h3>{language === 'fr' ? '📈 Tendances Récentes' : '📈 Recent Trends'}</h3>
                    <div className="trends">
                      <div className="trend-item">
                        <span className="trend-label">
                          {language === 'fr' ? 'Volume cette semaine' : 'This week volume'}
                        </span>
                        <span className="trend-value">
                          {stats.recentTrends.searchVolume?.current || 0}
                          {stats.recentTrends.searchVolume?.change !== 0 && (
                            <span className={`trend-change ${stats.recentTrends.searchVolume?.change > 0 ? 'up' : 'down'}`}>
                              {stats.recentTrends.searchVolume?.change > 0 ? '↑' : '↓'}
                              {Math.abs(stats.recentTrends.searchVolume?.change || 0)}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📊</span>
                <p>
                  {language === 'fr'
                    ? 'Pas assez de données pour les statistiques'
                    : 'Not enough data for statistics'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="insights-tab">
            <div className="insights-header">
              <button
                className="btn btn-ai btn-lg"
                onClick={handleGetAIInsights}
                disabled={isLoadingInsights}
              >
                {isLoadingInsights ? '⏳ ' : '🤖 '}
                {language === 'fr' ? 'Générer les Insights IA' : 'Generate AI Insights'}
              </button>
            </div>

            {isLoadingInsights && (
              <LoadingSpinner 
                message={language === 'fr' ? 'Analyse en cours...' : 'Analyzing...'} 
              />
            )}

            {aiInsights && (
              <div className="ai-insights-content">
                {/* Insights */}
                {aiInsights.insights && aiInsights.insights.length > 0 && (
                  <div className="insights-section">
                    <h3>💡 {language === 'fr' ? 'Insights' : 'Insights'}</h3>
                    <div className="insights-list">
                      {aiInsights.insights.map((insight, idx) => (
                        <div key={idx} className={`insight-item ${insight.type}`}>
                          <span className="insight-icon">
                            {insight.type === 'success' ? '✅' : 
                             insight.type === 'warning' ? '⚠️' : 'ℹ️'}
                          </span>
                          <span className="insight-message">{insight.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                  <div className="recommendations-section">
                    <h3>📝 {language === 'fr' ? 'Recommandations' : 'Recommendations'}</h3>
                    <ul className="recommendations-list">
                      {aiInsights.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec.message || rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trends */}
                {aiInsights.trends && aiInsights.trends.length > 0 && (
                  <div className="trends-section">
                    <h3>📈 {language === 'fr' ? 'Tendances' : 'Trends'}</h3>
                    <ul className="trends-list">
                      {aiInsights.trends.map((trend, idx) => (
                        <li key={idx}>{trend}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Message if no insights */}
                {aiInsights.message && (
                  <div className="insights-message">
                    <p>{aiInsights.message[language] || aiInsights.message}</p>
                  </div>
                )}
              </div>
            )}

            {!aiInsights && !isLoadingInsights && (
              <div className="empty-state">
                <span className="empty-icon">🤖</span>
                <p>
                  {language === 'fr'
                    ? 'Cliquez sur le bouton pour générer des insights IA'
                    : 'Click the button to generate AI insights'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchHistory;
