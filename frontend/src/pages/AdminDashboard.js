/**
 * Admin Dashboard Page
 * Page du Tableau de Bord Administrateur
 * 
 * System monitoring with:
 * - System usage statistics
 * - API usage by endpoint
 * - Error rate monitoring
 * - Performance metrics
 * - AI service status
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const AdminDashboard = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [apiUsage, setApiUsage] = useState(null);
  const [errorStats, setErrorStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const translations = {
    en: {
      title: 'Admin Dashboard',
      subtitle: 'System monitoring and analytics',
      systemStatus: 'System Status',
      apiUsage: 'API Usage',
      errorMonitoring: 'Error Monitoring',
      recentActivity: 'Recent Activity',
      performance: 'Performance',
      healthy: 'Healthy',
      warning: 'Warning',
      critical: 'Critical',
      uptime: 'Uptime',
      memory: 'Memory Usage',
      cpu: 'CPU Load',
      totalRequests: 'Total Requests',
      successRate: 'Success Rate',
      avgResponseTime: 'Avg Response Time',
      totalErrors: 'Total Errors',
      errorRate: 'Error Rate',
      topEndpoints: 'Top Endpoints',
      errorsByType: 'Errors by Type',
      recentErrors: 'Recent Errors',
      refresh: 'Refresh',
      autoRefresh: 'Auto Refresh',
      exportReport: 'Export Report',
      timeRange: 'Time Range',
      last24h: 'Last 24 Hours',
      last7d: 'Last 7 Days',
      last30d: 'Last 30 Days',
      requests: 'requests',
      ms: 'ms',
      loading: 'Loading...',
      noData: 'No data available',
      aiService: 'AI Service',
      geocodingSources: 'Geocoding Sources',
      available: 'Available',
      unavailable: 'Unavailable'
    },
    fr: {
      title: 'Tableau de Bord Admin',
      subtitle: 'Surveillance et analytique du système',
      systemStatus: 'État du Système',
      apiUsage: 'Utilisation de l\'API',
      errorMonitoring: 'Surveillance des Erreurs',
      recentActivity: 'Activité Récente',
      performance: 'Performance',
      healthy: 'Opérationnel',
      warning: 'Attention',
      critical: 'Critique',
      uptime: 'Temps de Fonctionnement',
      memory: 'Utilisation Mémoire',
      cpu: 'Charge CPU',
      totalRequests: 'Total Requêtes',
      successRate: 'Taux de Réussite',
      avgResponseTime: 'Temps de Réponse Moyen',
      totalErrors: 'Total Erreurs',
      errorRate: 'Taux d\'Erreur',
      topEndpoints: 'Endpoints Principaux',
      errorsByType: 'Erreurs par Type',
      recentErrors: 'Erreurs Récentes',
      refresh: 'Actualiser',
      autoRefresh: 'Actualisation Auto',
      exportReport: 'Exporter le Rapport',
      timeRange: 'Période',
      last24h: 'Dernières 24 Heures',
      last7d: '7 Derniers Jours',
      last30d: '30 Derniers Jours',
      requests: 'requêtes',
      ms: 'ms',
      loading: 'Chargement...',
      noData: 'Aucune donnée disponible',
      aiService: 'Service IA',
      geocodingSources: 'Sources de Géocodage',
      available: 'Disponible',
      unavailable: 'Indisponible'
    }
  };

  const text = translations[language];

  useEffect(() => {
    fetchDashboardData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const fetchDashboardData = async () => {
    try {
      // Fetch system status
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      const healthData = await healthResponse.json();
      
      // Fetch monitoring data
      const monitoringResponse = await fetch(`${API_BASE_URL}/admin/monitoring/status`);
      const monitoringData = await monitoringResponse.json();
      
      if (monitoringData.success) {
        setSystemStatus(monitoringData.data);
      } else {
        // Use mock data if endpoint not available
        setSystemStatus(generateMockSystemStatus());
      }

      // Fetch API usage
      const usageResponse = await fetch(`${API_BASE_URL}/admin/monitoring/usage`);
      const usageData = await usageResponse.json();
      
      if (usageData.success) {
        setApiUsage(usageData.data);
      } else {
        setApiUsage(generateMockApiUsage());
      }

      // Fetch error stats
      const errorResponse = await fetch(`${API_BASE_URL}/admin/monitoring/errors`);
      const errorData = await errorResponse.json();
      
      if (errorData.success) {
        setErrorStats(errorData.data);
      } else {
        setErrorStats(generateMockErrorStats());
      }

      // Fetch recent activity
      const activityResponse = await fetch(`${API_BASE_URL}/admin/monitoring/activity`);
      const activityData = await activityResponse.json();
      
      if (activityData.success) {
        setRecentActivity(activityData.data);
      } else {
        setRecentActivity(generateMockActivity());
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data on error
      setSystemStatus(generateMockSystemStatus());
      setApiUsage(generateMockApiUsage());
      setErrorStats(generateMockErrorStats());
      setRecentActivity(generateMockActivity());
    } finally {
      setLoading(false);
    }
  };

  // Mock data generators
  const generateMockSystemStatus = () => ({
    status: 'healthy',
    uptime: 86400,
    memory: { usagePercent: '45.2', used: 512000000, total: 1024000000 },
    cpu: { loadAvg: [0.5, 0.6, 0.7], cores: 4 },
    requests: { total: 1250, recent: 45, avgResponseTime: '125.50' },
    errors: { total: 12, recent: 2 }
  });

  const generateMockApiUsage = () => ({
    totalRequests: 1250,
    successfulRequests: 1200,
    failedRequests: 50,
    avgResponseTime: 125,
    byEndpoint: {
      '/api/geocoding/single': 450,
      '/api/geocoding/batch': 200,
      '/api/geocoding/history': 300,
      '/api/geocoding/ai/recommend': 150,
      '/api/health': 150
    },
    byMethod: { GET: 600, POST: 650 },
    byStatus: { 200: 1100, 400: 30, 404: 15, 500: 5 },
    responseTimeDistribution: { fast: 800, normal: 350, slow: 80, verySlow: 20 }
  });

  const generateMockErrorStats = () => ({
    totalErrors: 50,
    byType: {
      'VALIDATION_ERROR': 20,
      'NOT_FOUND': 15,
      'RATE_LIMITED': 10,
      'INTERNAL_ERROR': 5
    },
    byEndpoint: {
      '/api/geocoding/single': 15,
      '/api/geocoding/batch': 10,
      '/api/geocoding/ai/recommend': 5
    },
    recentErrors: [
      { timestamp: new Date().toISOString(), type: 'VALIDATION_ERROR', message: 'Invalid village name' },
      { timestamp: new Date(Date.now() - 300000).toISOString(), type: 'NOT_FOUND', message: 'Village not found' }
    ]
  });

  const generateMockActivity = () => [
    { type: 'request', timestamp: new Date().toISOString(), details: 'POST /api/geocoding/single - 200 (125ms)' },
    { type: 'request', timestamp: new Date(Date.now() - 60000).toISOString(), details: 'GET /api/geocoding/history - 200 (45ms)' },
    { type: 'error', timestamp: new Date(Date.now() - 120000).toISOString(), details: 'VALIDATION_ERROR: Invalid input' }
  ];

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy': return text.healthy;
      case 'warning': return text.warning;
      case 'critical': return text.critical;
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{text.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🔧 {text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {text.autoRefresh}
          </label>
          <button className="refresh-btn" onClick={fetchDashboardData}>
            🔄 {text.refresh}
          </button>
          <button className="export-btn">
            📊 {text.exportReport}
          </button>
        </div>
      </header>

      {/* System Status */}
      <section className="status-section">
        <h2>{text.systemStatus}</h2>
        <div className="status-grid">
          <div className="status-card main-status">
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(systemStatus?.status) }}
            />
            <div className="status-info">
              <span className="status-label">Status</span>
              <span className="status-value">{getStatusText(systemStatus?.status)}</span>
            </div>
          </div>
          <div className="status-card">
            <span className="card-icon">⏱️</span>
            <div className="card-content">
              <span className="card-value">{formatUptime(systemStatus?.uptime || 0)}</span>
              <span className="card-label">{text.uptime}</span>
            </div>
          </div>
          <div className="status-card">
            <span className="card-icon">💾</span>
            <div className="card-content">
              <span className="card-value">{systemStatus?.memory?.usagePercent || 0}%</span>
              <span className="card-label">{text.memory}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${systemStatus?.memory?.usagePercent || 0}%`,
                  backgroundColor: parseFloat(systemStatus?.memory?.usagePercent) > 80 ? '#f44336' : '#4caf50'
                }}
              />
            </div>
          </div>
          <div className="status-card">
            <span className="card-icon">🖥️</span>
            <div className="card-content">
              <span className="card-value">
                {((systemStatus?.cpu?.loadAvg?.[0] || 0) / (systemStatus?.cpu?.cores || 1) * 100).toFixed(1)}%
              </span>
              <span className="card-label">{text.cpu}</span>
            </div>
          </div>
        </div>
      </section>

      {/* API Usage */}
      <section className="usage-section">
        <h2>{text.apiUsage}</h2>
        <div className="usage-grid">
          <div className="metric-card">
            <span className="metric-value">{apiUsage?.totalRequests || 0}</span>
            <span className="metric-label">{text.totalRequests}</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">
              {apiUsage?.totalRequests > 0 
                ? ((apiUsage.successfulRequests / apiUsage.totalRequests) * 100).toFixed(1)
                : 0}%
            </span>
            <span className="metric-label">{text.successRate}</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{apiUsage?.avgResponseTime || 0} {text.ms}</span>
            <span className="metric-label">{text.avgResponseTime}</span>
          </div>
        </div>

        <div className="endpoints-section">
          <h3>{text.topEndpoints}</h3>
          <div className="endpoints-list">
            {apiUsage?.byEndpoint && Object.entries(apiUsage.byEndpoint)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([endpoint, count]) => (
                <div key={endpoint} className="endpoint-item">
                  <span className="endpoint-name">{endpoint}</span>
                  <div className="endpoint-bar">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(apiUsage.byEndpoint))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="endpoint-count">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="response-distribution">
          <h3>{text.performance}</h3>
          <div className="distribution-bars">
            {apiUsage?.responseTimeDistribution && Object.entries(apiUsage.responseTimeDistribution).map(([category, count]) => (
              <div key={category} className="distribution-item">
                <span className="dist-label">{category}</span>
                <div className="dist-bar">
                  <div 
                    className="dist-fill"
                    style={{ 
                      width: `${(count / apiUsage.totalRequests) * 100}%`,
                      backgroundColor: category === 'fast' ? '#4caf50' : 
                                       category === 'normal' ? '#2196f3' :
                                       category === 'slow' ? '#ff9800' : '#f44336'
                    }}
                  />
                </div>
                <span className="dist-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Error Monitoring */}
      <section className="error-section">
        <h2>{text.errorMonitoring}</h2>
        <div className="error-grid">
          <div className="error-summary">
            <div className="error-metric">
              <span className="error-value">{errorStats?.totalErrors || 0}</span>
              <span className="error-label">{text.totalErrors}</span>
            </div>
            <div className="error-metric">
              <span className="error-value">
                {apiUsage?.totalRequests > 0 
                  ? ((errorStats?.totalErrors / apiUsage.totalRequests) * 100).toFixed(2)
                  : 0}%
              </span>
              <span className="error-label">{text.errorRate}</span>
            </div>
          </div>

          <div className="errors-by-type">
            <h3>{text.errorsByType}</h3>
            {errorStats?.byType && Object.entries(errorStats.byType).map(([type, count]) => (
              <div key={type} className="error-type-item">
                <span className="error-type">{type}</span>
                <span className="error-count">{count}</span>
              </div>
            ))}
          </div>

          <div className="recent-errors">
            <h3>{text.recentErrors}</h3>
            {errorStats?.recentErrors?.length > 0 ? (
              <div className="errors-list">
                {errorStats.recentErrors.map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-time">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="error-type-badge">{error.type}</span>
                    <span className="error-message">{error.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-errors">{text.noData}</p>
            )}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <h2>{text.recentActivity}</h2>
        <div className="activity-list">
          {recentActivity.map((activity, index) => (
            <div key={index} className={`activity-item ${activity.type}`}>
              <span className="activity-icon">
                {activity.type === 'request' ? '📡' : '⚠️'}
              </span>
              <span className="activity-time">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </span>
              <span className="activity-details">{activity.details}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
