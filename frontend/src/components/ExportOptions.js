import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { exportAPI } from '../services/api';
import { toast } from 'react-toastify';
import './ExportOptions.css';

const ExportOptions = ({ results, filters, disabled }) => {
  const { t } = useLanguage();

  const handleExport = async (format) => {
    if (!results || results.length === 0) {
      toast.warning(t('messages.noResults'));
      return;
    }

    try {
      let response;
      let filename;
      
      switch (format) {
        case 'excel':
          response = await exportAPI.exportToExcel(results, filters);
          filename = `geocoding_results_${Date.now()}.xlsx`;
          break;
        case 'csv':
          response = await exportAPI.exportToCSV(results, filters);
          filename = `geocoding_results_${Date.now()}.csv`;
          break;
        case 'pdf':
          response = await exportAPI.exportToPDF(results, filters);
          filename = `geocoding_results_${Date.now()}.pdf`;
          break;
        default:
          return;
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(t('messages.exportSuccess'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('messages.exportError'));
    }
  };

  return (
    <div className="export-options">
      <h3 className="export-title">{t('results.export.title')}</h3>
      <div className="export-buttons">
        <button
          className="export-btn excel"
          onClick={() => handleExport('excel')}
          disabled={disabled}
        >
          <span className="export-icon">📊</span>
          <span>{t('results.export.excel')}</span>
        </button>
        <button
          className="export-btn csv"
          onClick={() => handleExport('csv')}
          disabled={disabled}
        >
          <span className="export-icon">📄</span>
          <span>{t('results.export.csv')}</span>
        </button>
        <button
          className="export-btn pdf"
          onClick={() => handleExport('pdf')}
          disabled={disabled}
        >
          <span className="export-icon">📕</span>
          <span>{t('results.export.pdf')}</span>
        </button>
      </div>
    </div>
  );
};

export default ExportOptions;
