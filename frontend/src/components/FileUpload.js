import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLanguage } from '../context/LanguageContext';
import './FileUpload.css';

const FileUpload = ({ onFileSelect, isLoading, uploadedFile }) => {
  const { t } = useLanguage();

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isLoading
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''} ${isLoading ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="dropzone-content">
          <div className="dropzone-icon">📁</div>
          
          {isDragActive ? (
            <p className="dropzone-text">{t('batch.upload.dropzone').split(',')[0]}...</p>
          ) : (
            <>
              <p className="dropzone-text">{t('batch.upload.dropzone')}</p>
              <p className="dropzone-hint">{t('batch.upload.formats')}</p>
              <p className="dropzone-hint">{t('batch.upload.maxSize')}</p>
            </>
          )}
        </div>
      </div>

      {uploadedFile && (
        <div className="uploaded-file">
          <div className="file-info">
            <span className="file-icon">📄</span>
            <div className="file-details">
              <span className="file-name">{uploadedFile.name}</span>
              <span className="file-size">{formatFileSize(uploadedFile.size)}</span>
            </div>
          </div>
          <button 
            className="file-remove"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
            }}
            aria-label="Remove file"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
