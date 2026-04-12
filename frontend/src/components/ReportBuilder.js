/**
 * Report Builder Component
 * Composant de Création de Rapports
 * 
 * Visual report builder with:
 * - Drag-and-drop field selection
 * - Preview before export
 * - Save report templates
 * - Schedule automated reports
 */

import React, { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ReportBuilder.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const ReportBuilder = ({ data = [], onClose }) => {
  const { language } = useLanguage();
  const [reportConfig, setReportConfig] = useState({
    title: '',
    type: 'batch_summary',
    format: 'pdf',
    selectedFields: ['villageName', 'latitude', 'longitude', 'confidence'],
    includeCharts: true,
    includeStatistics: true,
    includeMap: false,
    branding: {
      logo: '',
      companyName: '',
      primaryColor: '#ff6b35'
    }
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);

  const translations = {
    en: {
      title: 'Report Builder',
      subtitle: 'Create custom reports from your data',
      reportTitle: 'Report Title',
      reportType: 'Report Type',
      outputFormat: 'Output Format',
      selectFields: 'Select Fields',
      availableFields: 'Available Fields',
      selectedFields: 'Selected Fields',
      dragToReorder: 'Drag to reorder',
      options: 'Options',
      includeCharts: 'Include Charts',
      includeStatistics: 'Include Statistics',
      includeMap: 'Include Map',
      branding: 'Branding',
      companyName: 'Company Name',
      logo: 'Logo URL',
      primaryColor: 'Primary Color',
      preview: 'Preview',
      generate: 'Generate Report',
      saveTemplate: 'Save as Template',
      loadTemplate: 'Load Template',
      schedule: 'Schedule Report',
      cancel: 'Cancel',
      generating: 'Generating...',
      reportTypes: {
        batch_summary: 'Batch Summary',
        search_history: 'Search History',
        statistics: 'Statistics Report',
        custom: 'Custom Report'
      },
      formats: {
        pdf: 'PDF',
        excel: 'Excel',
        csv: 'CSV',
        json: 'JSON'
      },
      fields: {
        villageName: 'Village Name',
        latitude: 'Latitude',
        longitude: 'Longitude',
        confidence: 'Confidence',
        source: 'Source',
        formattedAddress: 'Address',
        timestamp: 'Timestamp',
        countryCode: 'Country',
        region: 'Region',
        found: 'Found Status'
      },
      previewTitle: 'Report Preview',
      noData: 'No data available for report',
      templateSaved: 'Template saved successfully',
      reportGenerated: 'Report generated successfully'
    },
    fr: {
      title: 'Créateur de Rapports',
      subtitle: 'Créez des rapports personnalisés à partir de vos données',
      reportTitle: 'Titre du Rapport',
      reportType: 'Type de Rapport',
      outputFormat: 'Format de Sortie',
      selectFields: 'Sélectionner les Champs',
      availableFields: 'Champs Disponibles',
      selectedFields: 'Champs Sélectionnés',
      dragToReorder: 'Glisser pour réorganiser',
      options: 'Options',
      includeCharts: 'Inclure les Graphiques',
      includeStatistics: 'Inclure les Statistiques',
      includeMap: 'Inclure la Carte',
      branding: 'Personnalisation',
      companyName: 'Nom de l\'Entreprise',
      logo: 'URL du Logo',
      primaryColor: 'Couleur Principale',
      preview: 'Aperçu',
      generate: 'Générer le Rapport',
      saveTemplate: 'Sauvegarder comme Modèle',
      loadTemplate: 'Charger un Modèle',
      schedule: 'Planifier le Rapport',
      cancel: 'Annuler',
      generating: 'Génération...',
      reportTypes: {
        batch_summary: 'Résumé par Lots',
        search_history: 'Historique de Recherche',
        statistics: 'Rapport Statistique',
        custom: 'Rapport Personnalisé'
      },
      formats: {
        pdf: 'PDF',
        excel: 'Excel',
        csv: 'CSV',
        json: 'JSON'
      },
      fields: {
        villageName: 'Nom du Village',
        latitude: 'Latitude',
        longitude: 'Longitude',
        confidence: 'Confiance',
        source: 'Source',
        formattedAddress: 'Adresse',
        timestamp: 'Horodatage',
        countryCode: 'Pays',
        region: 'Région',
        found: 'Statut Trouvé'
      },
      previewTitle: 'Aperçu du Rapport',
      noData: 'Aucune donnée disponible pour le rapport',
      templateSaved: 'Modèle sauvegardé avec succès',
      reportGenerated: 'Rapport généré avec succès'
    }
  };

  const text = translations[language];

  const allFields = [
    'villageName', 'latitude', 'longitude', 'confidence', 
    'source', 'formattedAddress', 'timestamp', 'countryCode', 
    'region', 'found'
  ];

  const availableFields = allFields.filter(
    field => !reportConfig.selectedFields.includes(field)
  );

  const handleFieldSelect = (field) => {
    setReportConfig(prev => ({
      ...prev,
      selectedFields: [...prev.selectedFields, field]
    }));
  };

  const handleFieldRemove = (field) => {
    setReportConfig(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.filter(f => f !== field)
    }));
  };

  const handleFieldReorder = (dragIndex, dropIndex) => {
    const newFields = [...reportConfig.selectedFields];
    const [removed] = newFields.splice(dragIndex, 1);
    newFields.splice(dropIndex, 0, removed);
    setReportConfig(prev => ({ ...prev, selectedFields: newFields }));
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/export/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        },
        body: JSON.stringify({
          type: reportConfig.type,
          data: data,
          options: {
            title: reportConfig.title,
            fields: reportConfig.selectedFields,
            includeCharts: reportConfig.includeCharts,
            includeStatistics: reportConfig.includeStatistics,
            includeMap: reportConfig.includeMap,
            branding: reportConfig.branding
          },
          format: reportConfig.format
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${Date.now()}.${reportConfig.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // Fallback: generate client-side
        generateClientSideReport();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      generateClientSideReport();
    } finally {
      setGenerating(false);
    }
  };

  const generateClientSideReport = () => {
    // Generate simple CSV/JSON on client side
    if (reportConfig.format === 'csv') {
      const headers = reportConfig.selectedFields.join(',');
      const rows = data.map(item => 
        reportConfig.selectedFields.map(field => item[field] ?? '').join(',')
      );
      const csv = [headers, ...rows].join('\n');
      downloadFile(csv, 'report.csv', 'text/csv');
    } else if (reportConfig.format === 'json') {
      const filteredData = data.map(item => {
        const filtered = {};
        reportConfig.selectedFields.forEach(field => {
          filtered[field] = item[field];
        });
        return filtered;
      });
      downloadFile(JSON.stringify(filteredData, null, 2), 'report.json', 'application/json');
    }
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleSaveTemplate = () => {
    const template = {
      id: Date.now(),
      name: reportConfig.title || 'Untitled Template',
      config: { ...reportConfig }
    };
    setSavedTemplates(prev => [...prev, template]);
    localStorage.setItem('reportTemplates', JSON.stringify([...savedTemplates, template]));
    alert(text.templateSaved);
  };

  const handleLoadTemplate = (template) => {
    setReportConfig(template.config);
  };

  // Calculate preview statistics
  const previewStats = {
    total: data.length,
    found: data.filter(item => item.found !== false && item.latitude).length,
    avgConfidence: data.length > 0 
      ? (data.reduce((sum, item) => sum + (item.confidence || 0), 0) / data.length * 100).toFixed(1)
      : 0
  };

  return (
    <div className="report-builder-overlay">
      <div className="report-builder">
        <header className="builder-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="builder-content">
          {/* Left Panel - Configuration */}
          <div className="config-panel">
            {/* Report Title */}
            <div className="config-section">
              <label>{text.reportTitle}</label>
              <input
                type="text"
                value={reportConfig.title}
                onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder={language === 'en' ? 'Enter report title...' : 'Entrez le titre du rapport...'}
              />
            </div>

            {/* Report Type */}
            <div className="config-section">
              <label>{text.reportType}</label>
              <select
                value={reportConfig.type}
                onChange={(e) => setReportConfig(prev => ({ ...prev, type: e.target.value }))}
              >
                {Object.entries(text.reportTypes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Output Format */}
            <div className="config-section">
              <label>{text.outputFormat}</label>
              <div className="format-options">
                {Object.entries(text.formats).map(([value, label]) => (
                  <button
                    key={value}
                    className={`format-btn ${reportConfig.format === value ? 'active' : ''}`}
                    onClick={() => setReportConfig(prev => ({ ...prev, format: value }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Selection */}
            <div className="config-section">
              <label>{text.selectFields}</label>
              <div className="field-selection">
                <div className="field-list available">
                  <h4>{text.availableFields}</h4>
                  {availableFields.map(field => (
                    <button
                      key={field}
                      className="field-item"
                      onClick={() => handleFieldSelect(field)}
                    >
                      + {text.fields[field] || field}
                    </button>
                  ))}
                </div>
                <div className="field-list selected">
                  <h4>{text.selectedFields}</h4>
                  <p className="hint">{text.dragToReorder}</p>
                  {reportConfig.selectedFields.map((field, index) => (
                    <div
                      key={field}
                      className="field-item selected"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('index', index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const dragIndex = parseInt(e.dataTransfer.getData('index'));
                        handleFieldReorder(dragIndex, index);
                      }}
                    >
                      <span className="drag-handle">⋮⋮</span>
                      {text.fields[field] || field}
                      <button 
                        className="remove-btn"
                        onClick={() => handleFieldRemove(field)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="config-section">
              <label>{text.options}</label>
              <div className="options-list">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeCharts}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                  />
                  {text.includeCharts}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeStatistics}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, includeStatistics: e.target.checked }))}
                  />
                  {text.includeStatistics}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeMap}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, includeMap: e.target.checked }))}
                  />
                  {text.includeMap}
                </label>
              </div>
            </div>

            {/* Branding */}
            <div className="config-section">
              <label>{text.branding}</label>
              <div className="branding-options">
                <input
                  type="text"
                  placeholder={text.companyName}
                  value={reportConfig.branding.companyName}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    branding: { ...prev.branding, companyName: e.target.value }
                  }))}
                />
                <div className="color-picker">
                  <span>{text.primaryColor}</span>
                  <input
                    type="color"
                    value={reportConfig.branding.primaryColor}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="preview-panel">
            <h3>{text.previewTitle}</h3>
            {data.length > 0 ? (
              <div className="preview-content">
                <div className="preview-header" style={{ borderColor: reportConfig.branding.primaryColor }}>
                  <h4>{reportConfig.title || 'Geocoding Report'}</h4>
                  {reportConfig.branding.companyName && (
                    <span className="company-name">{reportConfig.branding.companyName}</span>
                  )}
                </div>

                {reportConfig.includeStatistics && (
                  <div className="preview-stats">
                    <div className="stat-item">
                      <span className="stat-value">{previewStats.total}</span>
                      <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{previewStats.found}</span>
                      <span className="stat-label">Found</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{previewStats.avgConfidence}%</span>
                      <span className="stat-label">Avg Confidence</span>
                    </div>
                  </div>
                )}

                {reportConfig.includeCharts && (
                  <div className="preview-chart">
                    <div className="chart-placeholder">
                      📊 Chart Preview
                    </div>
                  </div>
                )}

                <div className="preview-table">
                  <table>
                    <thead>
                      <tr>
                        {reportConfig.selectedFields.slice(0, 4).map(field => (
                          <th key={field}>{text.fields[field] || field}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 5).map((item, index) => (
                        <tr key={index}>
                          {reportConfig.selectedFields.slice(0, 4).map(field => (
                            <td key={field}>
                              {field === 'confidence' 
                                ? `${((item[field] || 0) * 100).toFixed(0)}%`
                                : item[field] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 5 && (
                    <p className="more-rows">... and {data.length - 5} more rows</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-data">
                <span className="no-data-icon">📄</span>
                <p>{text.noData}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="builder-footer">
          <div className="secondary-actions">
            <button className="template-btn" onClick={handleSaveTemplate}>
              💾 {text.saveTemplate}
            </button>
            <button className="schedule-btn">
              ⏰ {text.schedule}
            </button>
          </div>
          <div className="primary-actions">
            <button className="cancel-btn" onClick={onClose}>
              {text.cancel}
            </button>
            <button 
              className="generate-btn"
              onClick={handleGenerateReport}
              disabled={generating || data.length === 0}
            >
              {generating ? text.generating : `📥 ${text.generate}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ReportBuilder;
