import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <button 
      className="language-switcher"
      onClick={toggleLanguage}
      aria-label={`Switch to ${language === 'en' ? 'French' : 'English'}`}
    >
      <span className={`lang-option ${language === 'en' ? 'active' : ''}`}>EN</span>
      <span className="lang-divider">/</span>
      <span className={`lang-option ${language === 'fr' ? 'active' : ''}`}>FR</span>
    </button>
  );
};

export default LanguageSwitcher;
