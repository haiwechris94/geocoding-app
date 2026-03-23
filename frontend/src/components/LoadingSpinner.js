import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message, progress }) => {
  return (
    <div className="loading-spinner-overlay">
      <div className="loading-spinner-content">
        <div className="spinner"></div>
        {message && <p className="loading-message">{message}</p>}
        {progress !== undefined && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
