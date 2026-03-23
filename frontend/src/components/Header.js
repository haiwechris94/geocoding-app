import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import './Header.css';

const Header = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavItems = [
    { path: '/',          label: language === 'en' ? 'Home'            : 'Accueil' },
    { path: '/dashboard', label: language === 'en' ? 'Dashboard'       : 'Tableau de Bord' },
    { path: '/search',    label: language === 'en' ? 'Advanced Search'  : 'Recherche Avancée' },
    { path: '/batch',     label: language === 'en' ? 'Batch Geocode'    : 'Géocodage par Lots' },
    { path: '/history',   label: language === 'en' ? 'History'          : 'Historique' },
  ];

  return (
    <header className="header">
      <div className="container header-container">

        {/* Brand Logo - left */}
        <Link to="/" className="logo">
          <img
            src={`${process.env.PUBLIC_URL}/images/icon_without_bg.png`}
            alt="Logo"
            className="logo-img"
          />
          <span className="logo-wordmark">
            <span className="logo-village">Village</span><span className="logo-point">Point</span>
          </span>
        </Link>

        {/* Main nav */}
        <nav className={`nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <ul className="nav-list">
            {mainNavItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side: Language switcher */}
        <div className="header-actions">
          <LanguageSwitcher />
        </div>

        {/* Mobile hamburger */}
        <button
          className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
          aria-label="Menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="menu-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
