/**
 * About Page — À propos de
 * Displays: API Documentation link, System Status, Geocoding Sources
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './About.css';

const GEOCODING_SOURCES = [
  {
    id: 'googleMaps',
    name: 'Google Maps',
    reliability: 0.95,
    operational: false,
    reason: { en: 'API key not configured (GOOGLE_MAPS_API_KEY)', fr: 'Clé API non configurée (GOOGLE_MAPS_API_KEY)' },
  },
  {
    id: 'geoNames',
    name: 'GeoNames',
    reliability: 0.85,
    operational: false,
    reason: { en: 'Username not configured (GEONAMES_USERNAME)', fr: "Nom d'utilisateur non configuré (GEONAMES_USERNAME)" },
  },
  {
    id: 'nominatim',
    name: 'Nominatim (OpenStreetMap)',
    reliability: 0.80,
    operational: true,
    reason: null,
  },
  {
    id: 'hdx',
    name: 'HDX — Humanitarian Data Exchange',
    reliability: 0.75,
    operational: false,
    reason: { en: 'API key not configured (HDX_API_KEY)', fr: 'Clé API non configurée (HDX_API_KEY)' },
  },
  {
    id: 'photon',
    name: 'Photon (Komoot)',
    reliability: 0.78,
    operational: true,
    reason: null,
  },
  {
    id: 'mapcarta',
    name: 'Mapcarta',
    reliability: 0.79,
    operational: true,
    reason: null,
  },
  {
    id: 'openCage',
    name: 'OpenCage',
    reliability: 0.82,
    operational: false,
    reason: { en: 'API key not configured (OPENCAGE_API_KEY)', fr: 'Clé API non configurée (OPENCAGE_API_KEY)' },
  },
  {
    id: 'locationIQ',
    name: 'LocationIQ',
    reliability: 0.82,
    operational: false,
    reason: { en: 'API key not configured (LOCATIONIQ_API_KEY)', fr: 'Clé API non configurée (LOCATIONIQ_API_KEY)' },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    reliability: null,
    operational: false,
    reason: { en: 'API key not configured (DEEPSEEK_API_KEY)', fr: 'Clé API non configurée (DEEPSEEK_API_KEY)' },
  },
];

const About = () => {
  const { language } = useLanguage();
  const [sourcesOpen, setSourcesOpen] = useState(true);

  const t = {
    en: {
      title: 'About',
      subtitle: 'Platform information, API documentation and system status',
      apiDocsTitle: 'API Documentation',
      apiDocsDesc: 'Complete reference for all geocoding endpoints, parameters and response formats.',
      apiDocsLink: 'Open Documentation →',
      systemStatus: 'System Status',
      apiHealth: 'API Health',
      healthy: 'Operational',
      geocodingSources: 'Geocoding Sources',
      geocodingSourcesDesc: 'List of all geocoding data sources and their current status.',
      operational: 'Operational',
      notOperational: 'Not operational',
      reliability: 'Reliability',
      reason: 'Reason',
    },
    fr: {
      title: 'À propos de',
      subtitle: "Informations sur la plateforme, documentation API et état du système",
      apiDocsTitle: 'Documentation API',
      apiDocsDesc: 'Référence complète de tous les endpoints de géocodage, paramètres et formats de réponse.',
      apiDocsLink: 'Ouvrir la documentation →',
      systemStatus: 'État du Système',
      apiHealth: "Santé de l'API",
      healthy: 'Opérationnel',
      geocodingSources: 'Sources de Géocodage',
      geocodingSourcesDesc: 'Liste de toutes les sources de données de géocodage et leur statut actuel.',
      operational: 'Opérationnel',
      notOperational: 'Non opérationnel',
      reliability: 'Fiabilité',
      reason: 'Raison',
    },
  };

  const text = t[language] || t.fr;

  return (
    <div className="about-page">
      {/* Page Header */}
      <div className="about-header">
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
      </div>

      {/* API Documentation Card */}
      <section className="about-section">
        <div className="about-card api-docs-card">
          <div className="about-card-icon">📚</div>
          <div className="about-card-body">
            <h2>{text.apiDocsTitle}</h2>
            <p>{text.apiDocsDesc}</p>
            <Link to="/api-docs" className="about-link-btn">{text.apiDocsLink}</Link>
          </div>
        </div>
      </section>

      {/* System Status */}
      <section className="about-section">
        <h2 className="about-section-title">{text.systemStatus}</h2>
        <div className="status-list">
          <div className="status-row">
            <span className="status-row-label">{text.apiHealth}</span>
            <span className="status-badge operational">
              <span className="status-dot"></span>
              {text.healthy}
            </span>
          </div>
        </div>
      </section>

      {/* Geocoding Sources */}
      <section className="about-section">
        <button
          className="sources-toggle"
          onClick={() => setSourcesOpen((o) => !o)}
          aria-expanded={sourcesOpen}
        >
          <span className="about-section-title">{text.geocodingSources}</span>
          <span className={`chevron ${sourcesOpen ? 'open' : ''}`}>▾</span>
        </button>
        <p className="sources-desc">{text.geocodingSourcesDesc}</p>

        {sourcesOpen && (
          <div className="sources-list">
            {GEOCODING_SOURCES.map((src) => (
              <div key={src.id} className={`source-row ${src.operational ? 'op' : 'nop'}`}>
                <div className="source-main">
                  <span className="source-name">{src.name}</span>
                  {src.reliability !== null && (
                    <span className="source-reliability">
                      {text.reliability}: {Math.round(src.reliability * 100)}%
                    </span>
                  )}
                </div>
                <div className="source-right">
                  <span className={`status-badge ${src.operational ? 'operational' : 'not-operational'}`}>
                    <span className="status-dot"></span>
                    {src.operational ? text.operational : text.notOperational}
                  </span>
                  {!src.operational && src.reason && (
                    <span className="source-reason">
                      {src.reason[language] || src.reason.fr}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default About;
