/**
 * Dashboard Component
 * Composant Tableau de Bord
 * 
 * Overview dashboard with:
 * - Key metrics
 * - Recent searches widget
 * - Success rate trends
 * - Quick actions panel
 * - AI recommendations widget
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const Dashboard = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiStatus, setAiStatus] = useState({ available: false });

  const translations = {
    en: {
      title: 'Dashboard',
      subtitle: 'Overview of your geocoding activity',
      welcome: 'Welcome back!',
      quickActions: 'Quick Actions',
      singleSearch: 'Single Search',
      batchUpload: 'Batch Upload',
      viewHistory: 'View History',
      apiDocs: 'API Docs',
      keyMetrics: 'Key Metrics',
      totalSearches: 'Total Searches',
      successRate: 'Success Rate',
      avgConfidence: 'Avg Confidence',
      todaySearches: 'Today\'s Searches',
      recentSearches: 'Recent Searches',
      viewAll: 'View All',
      noRecentSearches: 'No recent searches',
      aiRecommendations: 'AI Recommendations',
      generateRecommendations: 'Generate Recommendations',
      aiUnavailable: 'AI service unavailable',
      loading: 'Loading...',
      searchTrends: 'Search Trends',
      topCountries: 'Top Countries',
      systemStatus: 'System Status',
      apiHealth: 'API Health',
      healthy: 'Healthy',
      unhealthy: 'Unhealthy',
      geocodingSources: 'Geocoding Sources',
      sourcesAvailable: 'sources available',
      lastUpdated: 'Last updated',
      ago: 'ago',
      minutes: 'minutes',
      hours: 'hours',
      found: 'Found',
      notFound: 'Not Found',
      confidence: 'Confidence',
      getStarted: 'Get Started',
      getStartedDesc: 'Start geocoding African villages with our powerful tools',
      learnMore: 'Learn More'
    },
    fr: {
      title: 'Tableau de Bord',
      subtitle: 'Aperçu de votre activité de géocodage',
      welcome: 'Bienvenue!',
      quickActions: 'Actions Rapides',
      singleSearch: 'Recherche Simple',
      batchUpload: 'Téléchargement par Lots',
      viewHistory: 'Voir l\'Historique',
      apiDocs: 'Documentation API',
      keyMetrics: 'Métriques Clés',
      totalSearches: 'Total Recherches',
      successRate: 'Taux de Réussite',
      avgConfidence: 'Confiance Moyenne',
      todaySearches: 'Recherches Aujourd\'hui',
      recentSearches: 'Recherches Récentes',
      viewAll: 'Voir Tout',
      noRecentSearches: 'Aucune recherche récente',
      aiRecommendations: 'Recommandations IA',
      generateRecommendations: 'Générer des Recommandations',
      aiUnavailable: 'Service IA indisponible',
      loading: 'Chargement...',
      searchTrends: 'Tendances de Recherche',
      topCountries: 'Pays les Plus Recherchés',
      systemStatus: 'État du Système',
      apiHealth: 'Santé de l\'API',
      healthy: 'Opérationnel',
      unhealthy: 'Problème',
      geocodingSources: 'Sources de Géocodage',
      sourcesAvailable: 'sources disponibles',
      lastUpdated: 'Dernière mise à jour',
      ago: 'il y a',
      minutes: 'minutes',
      hours: 'heures',
      found: 'Trouvé',
      notFound: 'Non Trouvé',
      confidence: 'Confiance',
      getStarted: 'Commencer',
      getStartedDesc: 'Commencez à géocoder les villages africains avec nos outils puissants',
      learnMore: 'En Savoir Plus'
    }
  };

  const text = translations[language];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch statistics
      const statsResponse = await fetch(`${API_BASE_URL}/geocoding/history/stats`);
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch recent searches
      const historyResponse = await fetch(`${API_BASE_URL}/geocoding/history?limit=5`);
      const historyData = await historyResponse.json();
      if (historyData.success) {
        setRecentSearches(historyData.data.entries || []);
      }

      // Check AI status
      const aiResponse = await fetch(`${API_BASE_URL}/geocoding/ai/status`);
      const aiData = await aiResponse.json();
      if (aiData.success) {
        setAiStatus(aiData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecommendations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/geocoding/history/ai-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        }
      });
      const data = await response.json();
      if (data.success) {
        setAiRecommendations(data.data);
      }
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return `${diffMins} ${text.minutes} ${text.ago}`;
    }
    return `${diffHours} ${text.hours} ${text.ago}`;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.5) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{text.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={fetchDashboardData}
            aria-label="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>{text.quickActions}</h2>
        <div className="actions-grid">
          <Link to="/search" className="action-card">
            <span className="action-icon">🔍</span>
            <span className="action-label">{text.singleSearch}</span>
          </Link>
          <Link to="/batch" className="action-card">
            <span className="action-icon">📦</span>
            <span className="action-label">{text.batchUpload}</span>
          </Link>
          <Link to="/history" className="action-card">
            <span className="action-icon">📜</span>
            <span className="action-label">{text.viewHistory}</span>
          </Link>
          <Link to="/api-docs" className="action-card">
            <span className="action-icon">📚</span>
            <span className="action-label">{text.apiDocs}</span>
          </Link>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="key-metrics">
        <h2>{text.keyMetrics}</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <span className="metric-value">{stats?.totalSearches || 0}</span>
              <span className="metric-label">{text.totalSearches}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <span className="metric-value">
                {stats?.successRate ? `${(stats.successRate * 100).toFixed(1)}%` : '0%'}
              </span>
              <span className="metric-label">{text.successRate}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🎯</div>
            <div className="metric-content">
              <span className="metric-value">
                {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(1)}%` : '0%'}
              </span>
              <span className="metric-label">{text.avgConfidence}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📅</div>
            <div className="metric-content">
              <span className="metric-value">{stats?.todaySearches || 0}</span>
              <span className="metric-label">{text.todaySearches}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        {/* Recent Searches */}
        <section className="recent-searches">
          <div className="section-header">
            <h2>{text.recentSearches}</h2>
            <Link to="/history" className="view-all-link">{text.viewAll} →</Link>
          </div>
          {recentSearches.length > 0 ? (
            <div className="searches-list">
              {recentSearches.map((search, index) => (
                <div key={index} className="search-item">
                  <div className="search-info">
                    <span className="search-query">{search.query}</span>
                    <span className="search-time">{formatTimeAgo(search.timestamp)}</span>
                  </div>
                  <div className="search-status">
                    {search.found ? (
                      <span 
                        className="confidence-badge"
                        style={{ backgroundColor: getConfidenceColor(search.confidence) }}
                      >
                        {Math.round(search.confidence * 100)}%
                      </span>
                    ) : (
                      <span className="not-found-badge">{text.notFound}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{text.noRecentSearches}</p>
              <Link to="/search" className="start-btn">{text.getStarted}</Link>
            </div>
          )}
        </section>

        {/* AI Recommendations */}
        <section className="ai-recommendations">
          <div className="section-header">
            <h2>🤖 {text.aiRecommendations}</h2>
            {aiStatus.available && (
              <span className="ai-status available">AI Active</span>
            )}
          </div>
          {aiStatus.available ? (
            aiRecommendations ? (
              <div className="recommendations-content">
                {aiRecommendations.insights && (
                  <div className="insight-card">
                    <p>{aiRecommendations.insights}</p>
                  </div>
                )}
                {aiRecommendations.recommendations && (
                  <ul className="recommendations-list">
                    {aiRecommendations.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="generate-recommendations">
                <p>{language === 'en' 
                  ? 'Get personalized recommendations based on your search patterns'
                  : 'Obtenez des recommandations personnalisées basées sur vos habitudes de recherche'
                }</p>
                <button 
                  className="generate-btn"
                  onClick={generateAIRecommendations}
                >
                  {text.generateRecommendations}
                </button>
              </div>
            )
          ) : (
            <div className="ai-unavailable">
              <span className="unavailable-icon">⚠️</span>
              <p>{text.aiUnavailable}</p>
            </div>
          )}
        </section>

        {/* System Status */}
        <section className="system-status">
          <h2>{text.systemStatus}</h2>
          <div className="status-items">
            <div className="status-item">
              <span className="status-label">{text.apiHealth}</span>
              <span className="status-value healthy">
                <span className="status-dot"></span>
                {text.healthy}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">{text.geocodingSources}</span>
              <span className="status-value">
                4 {text.sourcesAvailable}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">AI Service</span>
              <span className={`status-value ${aiStatus.available ? 'healthy' : 'unhealthy'}`}>
                <span className="status-dot"></span>
                {aiStatus.available ? text.healthy : text.unhealthy}
              </span>
            </div>
          </div>
        </section>

        {/* Top Countries */}
        {stats?.byCountry && Object.keys(stats.byCountry).length > 0 && (
          <section className="top-countries">
            <h2>{text.topCountries}</h2>
            <div className="countries-list">
              {Object.entries(stats.byCountry)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([country, count], index) => (
                  <div key={country} className="country-item">
                    <span className="country-rank">#{index + 1}</span>
                    <span className="country-code">{country}</span>
                    <span className="country-count">{count}</span>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      {/* Get Started Banner */}
      {(!stats || stats.totalSearches === 0) && (
        <section className="get-started-banner">
          <div className="banner-content">
            <h2>{text.getStarted}</h2>
            <p>{text.getStartedDesc}</p>
            <div className="banner-actions">
              <Link to="/search" className="primary-btn">{text.singleSearch}</Link>
              <Link to="/user-guide" className="secondary-btn">{text.learnMore}</Link>
            </div>
          </div>
          <div className="banner-illustration">
            🌍
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
