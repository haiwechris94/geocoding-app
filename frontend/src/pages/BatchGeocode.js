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

const BatchGeocode = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('mode') === 'manual' ? 'manual' : 'upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [villages, setVillages] = useState([]);
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  // Handle file selection
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
        
        // Auto-select first column if only one
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

  // Handle geocoding
  const handleStartGeocoding = async () => {
    setIsLoading(true);
    setProgress(0);

    try {
      let response;

      if (activeTab === 'upload' && fileData) {
        if (!selectedColumn) {
          toast.warning(t('messages.selectColumn'));
          setIsLoading(false);
          return;
        }

        response = await geocodingAPI.batchGeocodeFromFile(
          fileData.filePath,
          selectedColumn,
          filters
        );
      } else if (activeTab === 'manual' && villages.length > 0) {
        response = await geocodingAPI.batchGeocodeManual(villages, filters);
      } else {
        toast.warning(t('messages.noVillages'));
        setIsLoading(false);
        return;
      }

      if (response.success) {
        setResults(response.data);
        toast.success(t('messages.geocodingComplete'));
        
        // Store results in sessionStorage for Results page
        sessionStorage.setItem('geocodingResults', JSON.stringify(response.data));
        
        // Navigate to results
        navigate('/results');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error(t('messages.geocodingError'));
    } finally {
      setIsLoading(false);
    }
  };

  const canStartGeocoding = () => {
    if (activeTab === 'upload') {
      return fileData && selectedColumn;
    }
    return villages.length > 0;
  };

  return (
    <div className="batch-geocode-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('batch.title')}</h1>
          <p className="page-subtitle">{t('batch.subtitle')}</p>
        </header>

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
          {/* Input Section */}
          <section className="input-section card">
            {activeTab === 'upload' ? (
              <>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  isLoading={isLoading}
                  uploadedFile={uploadedFile}
                />

                {/* Column Selection */}
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
                        <option key={index} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>

                    {/* Preview */}
                    {fileData.preview && fileData.preview.length > 0 && (
                      <div className="file-preview">
                        <h4>{t('batch.upload.preview')}</h4>
                        <table className="preview-table">
                          <thead>
                            <tr>
                              {fileData.headers.map((header, index) => (
                                <th key={index} className={header === selectedColumn ? 'selected' : ''}>
                                  {header}
                                </th>
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
              <ManualEntry
                villages={villages}
                onVillagesChange={setVillages}
              />
            )}
          </section>

          {/* Filters Section */}
          <FilterOptions
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Actions */}
          <div className="batch-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={handleStartGeocoding}
              disabled={!canStartGeocoding() || isLoading}
            >
              {isLoading ? t('common.processing') : t('batch.actions.startGeocoding')}
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <LoadingSpinner
            message={t('common.processing')}
            progress={progress}
          />
        )}
      </div>
    </div>
  );
};

export default BatchGeocode;
