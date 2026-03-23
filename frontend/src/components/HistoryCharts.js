/**
 * History Charts Component
 * Composant de Graphiques d'Historique
 * 
 * Advanced visualization charts for search history:
 * - Line chart for search trends over time
 * - Bar chart for confidence distribution
 * - Pie chart for search types
 * - Interactive tooltips and legends
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './HistoryCharts.css';

const HistoryCharts = ({ historyData = [], statistics = {} }) => {
  const { language } = useLanguage();
  const [activeChart, setActiveChart] = useState('trends');
  const [timeRange, setTimeRange] = useState('week');
  const canvasRef = useRef(null);

  const translations = {
    en: {
      title: 'Analytics Dashboard',
      trends: 'Search Trends',
      confidence: 'Confidence Distribution',
      types: 'Search Types',
      frequency: 'Search Frequency',
      timeRange: 'Time Range',
      day: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      searches: 'Searches',
      date: 'Date',
      count: 'Count',
      percentage: 'Percentage',
      high: 'High (>80%)',
      medium: 'Medium (50-80%)',
      low: 'Low (<50%)',
      single: 'Single Search',
      batch: 'Batch Processing',
      area: 'Area Search',
      noData: 'No data available',
      totalSearches: 'Total Searches',
      avgConfidence: 'Avg Confidence',
      successRate: 'Success Rate',
      peakHour: 'Peak Hour',
      mostSearched: 'Most Searched Country'
    },
    fr: {
      title: 'Tableau de Bord Analytique',
      trends: 'Tendances de Recherche',
      confidence: 'Distribution de Confiance',
      types: 'Types de Recherche',
      frequency: 'Fréquence de Recherche',
      timeRange: 'Période',
      day: 'Aujourd\'hui',
      week: 'Cette Semaine',
      month: 'Ce Mois',
      year: 'Cette Année',
      searches: 'Recherches',
      date: 'Date',
      count: 'Nombre',
      percentage: 'Pourcentage',
      high: 'Élevée (>80%)',
      medium: 'Moyenne (50-80%)',
      low: 'Faible (<50%)',
      single: 'Recherche Simple',
      batch: 'Traitement par Lots',
      area: 'Recherche par Zone',
      noData: 'Aucune donnée disponible',
      totalSearches: 'Total Recherches',
      avgConfidence: 'Confiance Moyenne',
      successRate: 'Taux de Réussite',
      peakHour: 'Heure de Pointe',
      mostSearched: 'Pays le Plus Recherché'
    }
  };

  const text = translations[language];

  // Process data for charts
  const processedData = {
    trends: processTrendsData(historyData, timeRange),
    confidence: processConfidenceData(historyData),
    types: processTypesData(historyData),
    frequency: processFrequencyData(historyData)
  };

  function processTrendsData(data, range) {
    const now = new Date();
    let startDate;
    let groupBy;

    switch (range) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        groupBy = 'hour';
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupBy = 'day';
    }

    const filtered = data.filter(item => new Date(item.timestamp) >= startDate);
    const grouped = {};

    filtered.forEach(item => {
      const date = new Date(item.timestamp);
      let key;

      if (groupBy === 'hour') {
        key = date.getHours();
      } else if (groupBy === 'day') {
        key = date.toLocaleDateString();
      } else {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }

  function processConfidenceData(data) {
    const high = data.filter(item => item.confidence >= 0.8).length;
    const medium = data.filter(item => item.confidence >= 0.5 && item.confidence < 0.8).length;
    const low = data.filter(item => item.confidence < 0.5).length;

    return [
      { label: text.high, value: high, color: '#4caf50' },
      { label: text.medium, value: medium, color: '#ff9800' },
      { label: text.low, value: low, color: '#f44336' }
    ];
  }

  function processTypesData(data) {
    const types = {};
    data.forEach(item => {
      const type = item.type || 'single';
      types[type] = (types[type] || 0) + 1;
    });

    const colors = {
      single: '#2196f3',
      batch: '#9c27b0',
      area: '#00bcd4'
    };

    const labels = {
      single: text.single,
      batch: text.batch,
      area: text.area
    };

    return Object.entries(types).map(([type, value]) => ({
      label: labels[type] || type,
      value,
      color: colors[type] || '#666'
    }));
  }

  function processFrequencyData(data) {
    const hours = Array(24).fill(0);
    data.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      hours[hour]++;
    });

    return hours.map((value, hour) => ({
      label: `${hour}:00`,
      value
    }));
  }

  // Calculate summary statistics
  const summaryStats = {
    totalSearches: historyData.length,
    avgConfidence: historyData.length > 0
      ? (historyData.reduce((sum, item) => sum + (item.confidence || 0), 0) / historyData.length * 100).toFixed(1)
      : 0,
    successRate: historyData.length > 0
      ? ((historyData.filter(item => item.found).length / historyData.length) * 100).toFixed(1)
      : 0,
    peakHour: processedData.frequency.reduce((max, item, idx, arr) => 
      item.value > (arr[max]?.value || 0) ? idx : max, 0),
    mostSearched: getMostSearchedCountry(historyData)
  };

  function getMostSearchedCountry(data) {
    const countries = {};
    data.forEach(item => {
      if (item.filters?.countryCode) {
        countries[item.filters.countryCode] = (countries[item.filters.countryCode] || 0) + 1;
      }
    });
    const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }

  // Render line chart
  const renderLineChart = (data) => {
    if (data.length === 0) {
      return <div className="no-data">{text.noData}</div>;
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = 200;
    const chartWidth = 100;

    return (
      <div className="line-chart">
        <div className="chart-y-axis">
          {[maxValue, Math.round(maxValue / 2), 0].map((val, idx) => (
            <span key={idx}>{val}</span>
          ))}
        </div>
        <div className="chart-area">
          <svg viewBox={`0 0 ${data.length * 40} ${chartHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Area fill */}
            <path
              d={`M 0 ${chartHeight} ${data.map((d, i) => 
                `L ${i * 40 + 20} ${chartHeight - (d.value / maxValue) * (chartHeight - 20)}`
              ).join(' ')} L ${(data.length - 1) * 40 + 20} ${chartHeight} Z`}
              fill="url(#lineGradient)"
            />
            
            {/* Line */}
            <path
              d={data.map((d, i) => 
                `${i === 0 ? 'M' : 'L'} ${i * 40 + 20} ${chartHeight - (d.value / maxValue) * (chartHeight - 20)}`
              ).join(' ')}
              fill="none"
              stroke="#ff6b35"
              strokeWidth="2"
            />
            
            {/* Points */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={i * 40 + 20}
                cy={chartHeight - (d.value / maxValue) * (chartHeight - 20)}
                r="4"
                fill="#ff6b35"
                className="chart-point"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            ))}
          </svg>
          <div className="chart-x-axis">
            {data.map((d, i) => (
              <span key={i} style={{ left: `${(i / (data.length - 1 || 1)) * 100}%` }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render bar chart
  const renderBarChart = (data) => {
    if (data.length === 0 || data.every(d => d.value === 0)) {
      return <div className="no-data">{text.noData}</div>;
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
      <div className="bar-chart">
        {data.map((item, index) => (
          <div key={index} className="bar-item">
            <div className="bar-label">{item.label}</div>
            <div className="bar-container">
              <div 
                className="bar-fill"
                style={{ 
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#ff6b35'
                }}
              >
                <span className="bar-value">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render pie chart
  const renderPieChart = (data) => {
    if (data.length === 0 || data.every(d => d.value === 0)) {
      return <div className="no-data">{text.noData}</div>;
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = 0;

    const slices = data.map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
      const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
      const largeArc = angle > 180 ? 1 : 0;

      return {
        ...item,
        percentage,
        path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
      };
    });

    return (
      <div className="pie-chart">
        <svg viewBox="0 0 100 100">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              className="pie-slice"
            >
              <title>{`${slice.label}: ${slice.value} (${slice.percentage.toFixed(1)}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="pie-legend">
          {slices.map((slice, index) => (
            <div key={index} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: slice.color }}></span>
              <span className="legend-label">{slice.label}</span>
              <span className="legend-value">{slice.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render heatmap
  const renderHeatmap = (data) => {
    if (data.length === 0) {
      return <div className="no-data">{text.noData}</div>;
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
      <div className="heatmap">
        <div className="heatmap-grid">
          {data.map((item, index) => (
            <div
              key={index}
              className="heatmap-cell"
              style={{
                backgroundColor: `rgba(255, 107, 53, ${item.value / maxValue})`
              }}
              title={`${item.label}: ${item.value} ${text.searches}`}
            >
              <span className="cell-label">{item.label.split(':')[0]}</span>
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>{text.low}</span>
          <div className="gradient-bar"></div>
          <span>{text.high}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="history-charts">
      <div className="charts-header">
        <h3>{text.title}</h3>
        <div className="chart-tabs">
          <button
            className={activeChart === 'trends' ? 'active' : ''}
            onClick={() => setActiveChart('trends')}
          >
            📈 {text.trends}
          </button>
          <button
            className={activeChart === 'confidence' ? 'active' : ''}
            onClick={() => setActiveChart('confidence')}
          >
            📊 {text.confidence}
          </button>
          <button
            className={activeChart === 'types' ? 'active' : ''}
            onClick={() => setActiveChart('types')}
          >
            🥧 {text.types}
          </button>
          <button
            className={activeChart === 'frequency' ? 'active' : ''}
            onClick={() => setActiveChart('frequency')}
          >
            🔥 {text.frequency}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-value">{summaryStats.totalSearches}</span>
          <span className="stat-label">{text.totalSearches}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{summaryStats.avgConfidence}%</span>
          <span className="stat-label">{text.avgConfidence}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{summaryStats.successRate}%</span>
          <span className="stat-label">{text.successRate}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{summaryStats.peakHour}:00</span>
          <span className="stat-label">{text.peakHour}</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="chart-container">
        {activeChart === 'trends' && (
          <div className="chart-section">
            <div className="chart-controls">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                aria-label={text.timeRange}
              >
                <option value="day">{text.day}</option>
                <option value="week">{text.week}</option>
                <option value="month">{text.month}</option>
                <option value="year">{text.year}</option>
              </select>
            </div>
            {renderLineChart(processedData.trends)}
          </div>
        )}

        {activeChart === 'confidence' && (
          <div className="chart-section">
            {renderBarChart(processedData.confidence)}
          </div>
        )}

        {activeChart === 'types' && (
          <div className="chart-section">
            {renderPieChart(processedData.types)}
          </div>
        )}

        {activeChart === 'frequency' && (
          <div className="chart-section">
            <h4>{text.frequency}</h4>
            {renderHeatmap(processedData.frequency)}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryCharts;
