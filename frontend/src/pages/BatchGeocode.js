import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { geocodingAPI } from '../services/api';
import { toast } from 'react-toastify';
import FileUpload from '../components/FileUpload';
import ManualEntry from '../components/ManualEntry';
import FilterOptions from '../components/FilterOptions';
import LoadingSpinner from '../components/LoadingSpinner';
import './BatchGeocode.css';

const SOURCES = [
  { id: 'nominatim',  name: 'Nominatim (OSM)',        icon: '🗺️',  free: true,  reliability: 80 },
  { id: 'geonames',   name: 'GeoNames',               icon: '🌍',  free: true,  reliability: 85 },
  { id: 'opencage',   name: 'OpenCage',               icon: '🔑',  free: false, reliability: 82 },
  { id: 'photon',     name: 'Photon (Komoot)',         icon: '⚡',  free: true,  reliability: 78 },
  { id: 'overpass',   name: 'Overpass (OSM Avancé)',   icon: '🔍',  free: true,  reliability: 88 },
  { id: 'wikidata',   name: 'Wikidata / Wikipedia',    icon: '📚',  free: true,  reliability: 90 },
  { id: 'brave',      name: 'Brave Search',            icon: '🦁',  free: false, reliability: 65 },
  { id: 'google',     name: 'Google Maps',             icon: '📍',  free: false, reliability: 95 },
  { id: 'geoagent',   name: 'GeoAgent IA (DeepSeek)', icon: '🤖',  free: false, reliability: 95 },
];

const BatchGeocode = () => {
  const { t, language } = useLanguage();
  const lang = language || 'fr';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('mode') === 'manual' ? 'manual' : 'upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [villages, setVillages] = useState([]);
  const [filters, setFilters] = useState({});
  const [useGeoAgent, setUseGeoAgent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVillage, setCurrentVillage] = useState('');
  const [liveStats, setLiveStats] = useState({ found: 0, notFound: 0, lowConf: 0 });
  const [results, setResults] = useState(null);
  const [sourcesStatus, setSourcesStatus] = useState({});

  // Load sources status on mount
  useEffect(() => {
    geocodingAPI.getSourcesStatus()
      .then(res => {
        if (res.success) setSourcesStatus(res.data.sources || {});
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = async (file) => {
    if (!file) {
      setUploadedFile(null);
      setFileData(null);
      setSelectedColumn('');
      return;
    }
    setUploadedFile(file);
    setIsLoading(true);
    try {
      const response = await geocodingAPI.uploadFile(file);
      if (response.success) {
        setFileData(response.data);
        toast.success(t('messages.fileUploaded'));
        if (response.data.headers.length === 1) {
          setSelectedColumn(response.data.headers[0]);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('messages.fileError'));
      setUploadedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeocoding = async () => {
    setIsLoading(true);
    setProgress(0);
    setCurrentVillage('');
    setLiveStats({ found: 0, notFound: 0, lowConf: 0 });

    const enrichedFilters = { ...filters, useGeoAgent };

    try {
      let response;
      if (activeTab === 'upload' && fileData) {
        if (!selectedColumn) {
          toast.warning(t('messages.selectColumn'));
          setIsLoading(false);
          return;
        }
        // Simulate progress for file-based geocoding
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 2, 90));
        }, 500);
        
        response = await geocodingAPI.batchGeocodeFromFile(
          fileData.filePath,
          selectedColumn,
          enrichedFilters
        );
        clearInterval(progressInterval);
        setProgress(100);
      } else if (activeTab === 'manual' && villages.length > 0) {
        // Manual: simulate per-village progress
        const total = villages.length;
        const partialResults = [];
        let found = 0, notFound = 0, lowConf = 0;

        for (let i = 0; i < total; i++) {
          setCurrentVillage(villages[i]);
          setProgress(Math.round(((i + 1) / total) * 100));
          
          try {
            const singleResp = await geocodingAPI.geocodeSingle(villages[i], enrichedFilters);
            if (singleResp.success && singleResp.data) {
              partialResults.push(singleResp.data);
              if (singleResp.data.found) {
                found++;
                if ((singleResp.data.confidence || 0) < 0.7) lowConf++;
              } else {
                notFound++;
              }
            }
          } catch (e) {
            notFound++;
          }
          setLiveStats({ found, notFound, lowConf });
        }

        response = {
          success: true,
          data: {
            results: partialResults,
            statistics: { total, found, notFound, lowConfidence: lowConf, successRate: Math.round((found / total) * 100) }
          }
        };
      } else {
        toast.warning(t('messages.noVillages'));
        setIsLoading(false);
        return;
      }

      if (response.success) {
        setResults(response.data);
        toast.success(t('messages.geocodingComplete'));
        sessionStorage.setItem('geocodingResults', JSON.stringify(response.data));
        navigate('/results');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error(t('messages.geocodingError'));
    } finally {
      setIsLoading(false);
      setCurrentVillage('');
    }
  };

  const canStartGeocoding = () => {
    if (activeTab === 'upload') return fileData && selectedColumn;
    return villages.length > 0;
  };

  const isSourceActive = (sourceId) => {
    const s = sourcesStatus[sourceId];
    if (!s) return sourceId === 'nominatim' || sourceId === 'photon' || sourceId === 'overpass' || sourceId === 'wikidata' || sourceId === 'geoagent';
    return s.enabled && s.available;
  };

  const texts = {
    fr: {
      sourcesTitle: '🔌 Sources de géocodage actives',
      sourcesSubtitle: 'Toutes ces sources sont interrogées en parallèle pour chaque village',
      geoAgentLabel: '🤖 Utiliser GeoAgent IA (recommandé)',
      geoAgentDesc: 'Agrège toutes les sources + scoring DeepSeek pour le meilleur résultat',
      active: 'Actif',
      inactive: 'Inactif',
      free: 'Gratuit',
      paid: 'Clé API',
      reliability: 'Fiabilité',
      progressLabel: 'Village en cours :',
      statsFound: 'Trouvés',
      statsNotFound: 'Non trouvés',
      statsLowConf: 'Confiance faible',
    },
    en: {
      sourcesTitle: '🔌 Active geocoding sources',
      sourcesSubtitle: 'All these sources are queried in parallel for each village',
      geoAgentLabel: '🤖 Use GeoAgent AI (recommended)',
      geoAgentDesc: 'Aggregates all sources + DeepSeek scoring for the best result',
      active: 'Active',
      inactive: 'Inactive',
      free: 'Free',
      paid: 'API Key',
      reliability: 'Reliability',
      progressLabel: 'Current village:',
      statsFound: 'Found',
      statsNotFound: 'Not found',
      statsLowConf: 'Low confidence',
    }
  };
  const tx = texts[lang] || texts.fr;

  return (
    <div className="batch-geocode-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('batch.title')}</h1>
          <p className="page-subtitle">{t('batch.subtitle')}</p>
        </header>

        {/* Sources Panel */}
        <div className="sources-panel card">
          <h3 className="sources-title">{tx.sourcesTitle}</h3>
          <p className="sources-subtitle">{tx.sourcesSubtitle}</p>
          <div className="sources-grid">
            {SOURCES.map(src => {
              const active = isSourceActive(src.id);
              return (
                <div key={src.id} className={`source-badge ${active ? 'source-active' : 'source-inactive'}`}>
                  <span className="source-icon">{src.icon}</span>
                  <div className="source-info">
                    <span className="source-name">{src.name}</span>
                    <div className="source-meta">
                      <span className={`source-status ${active ? 'status-on' : 'status-off'}`}>
                        {active ? tx.active : tx.inactive}
                      </span>
                      <span className="source-type">{src.free ? tx.free : tx.paid}</span>
                      <span className="source-reliability">{tx.reliability}: {src.reliability}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GeoAgent toggle */}
          <div className="geoagent-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={useGeoAgent}
                onChange={e => setUseGeoAgent(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-text">{tx.geoAgentLabel}</span>
            </label>
            <p className="toggle-desc">{tx.geoAgentDesc}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📁 {t('batch.tabs.upload')}
          </button>
          <button
            className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            ✏️ {t('batch.tabs.manual')}
          </button>
        </div>

        {/* Content */}
        <div className="batch-content">
          <section className="input-section card">
            {activeTab === 'upload' ? (
              <>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  isLoading={isLoading}
                  uploadedFile={uploadedFile}
                />
                {fileData && fileData.headers && (
                  <div className="column-selection">
                    <label className="form-label">{t('batch.upload.selectColumn')}</label>
                    <select
                      className="form-select"
                      value={selectedColumn}
                      onChange={(e) => setSelectedColumn(e.target.value)}
                    >
                      <option value="">-- {t('common.select')} --</option>
                      {fileData.headers.map((header, index) => (
                        <option key={index} value={header}>{header}</option>
                      ))}
                    </select>
                    {fileData.preview && fileData.preview.length > 0 && (
                      <div className="file-preview">
                        <h4>{t('batch.upload.preview')}</h4>
                        <table className="preview-table">
                          <thead>
                            <tr>
                              {fileData.headers.map((header, index) => (
                                <th key={index} className={header === selectedColumn ? 'selected' : ''}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fileData.preview.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {fileData.headers.map((header, colIndex) => (
                                  <td key={colIndex} className={header === selectedColumn ? 'selected' : ''}>
                                    {row[header] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="preview-info">
                          {t('batch.progress.processed')} {fileData.totalRows} {t('batch.progress.villages')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <ManualEntry villages={villages} onVillagesChange={setVillages} />
            )}
          </section>

          <FilterOptions filters={filters} onFiltersChange={setFilters} />

          {/* Live stats during loading */}
          {isLoading && activeTab === 'manual' && (
            <div className="live-stats card">
              <div className="live-stat">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{liveStats.found}</span>
                <span className="stat-label">{tx.statsFound}</span>
              </div>
              <div className="live-stat">
                <span className="stat-icon">❌</span>
                <span className="stat-value">{liveStats.notFound}</span>
                <span className="stat-label">{tx.statsNotFound}</span>
              </div>
              <div className="live-stat">
                <span className="stat-icon">⚠️</span>
                <span className="stat-value">{liveStats.lowConf}</span>
                <span className="stat-label">{tx.statsLowConf}</span>
              </div>
              {currentVillage && (
                <div className="current-village">
                  <span>{tx.progressLabel}</span>
                  <strong>{currentVillage}</strong>
                </div>
              )}
            </div>
          )}

          <div className="batch-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={handleStartGeocoding}
              disabled={!canStartGeocoding() || isLoading}
            >
              {isLoading
                ? `${t('common.processing')} ${progress > 0 ? progress + '%' : '...'}`
                : t('batch.actions.startGeocoding')}
            </button>
          </div>
        </div>

        {isLoading && (
          <LoadingSpinner
            message={currentVillage ? `${tx.progressLabel} ${currentVillage}` : t('common.processing')}
            progress={progress}
          />
        )}
      </div>
    </div>
  );
};

export default BatchGeocode;
