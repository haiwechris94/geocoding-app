import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ManualEntry.css';

const ManualEntry = ({ onVillagesChange, villages }) => {
  const { t, language } = useLanguage();
  const [inputValue, setInputValue] = useState(villages.join('\n'));

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Parse villages from textarea
    const villageList = value
      .split('\n')
      .map(v => v.trim())
      .filter(v => v.length > 0);
    
    onVillagesChange(villageList);
  };

  const handleClear = () => {
    setInputValue('');
    onVillagesChange([]);
  };

  const villageCount = villages.filter(v => v.length > 0).length;
  const maxVillages = 1000;
  const recommendedMax = 100;

  // Get status color based on count
  const getCountStatus = () => {
    if (villageCount === 0) return '';
    if (villageCount <= recommendedMax) return 'good';
    if (villageCount <= maxVillages) return 'warning';
    return 'error';
  };

  return (
    <div className="manual-entry">
      <div className="manual-entry-header">
        <label className="form-label">{t('batch.manual.placeholder')}</label>
        <div className="village-count-container">
          {villageCount > 0 && (
            <span className={`village-count ${getCountStatus()}`}>
              {villageCount} / {maxVillages} {t('batch.progress.villages')}
            </span>
          )}
        </div>
      </div>
      
      <div className="capacity-info">
        <span className="capacity-badge">
          ✓ {language === 'fr' 
            ? `Capacité: 100` 
            : `Capacity: 100`}
        </span>
      </div>
      
      <textarea
        className={`manual-textarea ${villageCount > maxVillages ? 'error' : ''}`}
        value={inputValue}
        onChange={handleChange}
        placeholder={language === 'fr' 
          ? 'Entrez les noms de villages, un par ligne...\n\nExemple:\nVillage 1\nVillage 2\nVillage 3\n...\n\nVous pouvez entrer jusqu\'à 1000 villages à la fois.'
          : 'Enter village names, one per line...\n\nExample:\nVillage 1\nVillage 2\nVillage 3\n...\n\nYou can enter up to 1000 villages at once.'}
        rows={15}
      />
      
      {villageCount > maxVillages && (
        <div className="error-message">
          {language === 'fr' 
            ? `⚠️ Limite dépassée: ${villageCount - maxVillages} villages en trop. Maximum: ${maxVillages}`
            : `⚠️ Limit exceeded: ${villageCount - maxVillages} villages over. Maximum: ${maxVillages}`}
        </div>
      )}
      
      <div className="manual-entry-actions">
        <p className="manual-hint">
          {language === 'fr' 
            ? '💡 Astuce: Copiez-collez une liste de villages depuis Excel ou un fichier texte'
            : '💡 Tip: Copy-paste a list of villages from Excel or a text file'}
        </p>
        {villageCount > 0 && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleClear}
          >
            {t('batch.manual.clearAll')}
          </button>
        )}
      </div>
    </div>
  );
};

export default ManualEntry;