/**
 * About Page — À propos de
 * Displays: API Documentation link, System Status, Geocoding Sources
 * Sources are fetched dynamically from the backend at runtime.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './About.css';

const About = () => {
  const { language } = useLanguage();
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);

  const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoadingSources(true);
        setSourcesError(null);
        const res = await fetch(`${API_BASE}/api/sources/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setSources(json.data);
        } else {
          throw new Error(json.error || 'Unknown error');
        }
      } catch (err) {
        setSourcesError(err.message);
      } finally {
        setLoadingSources(false);
      }
    };
    fetchSources();
  }, [API_BASE]);

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
      loading: 'Loading sources…',
      error: 'Unable to load sources',
    },
    fr: {
      title: 'À propos de',
      subtitle: 'Informations sur la plateforme, documentation API et état du système',
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
      loading: 'Chargement des sources…',
      error: 'Impossible de charger les sources',
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
            {loadingSources ? (
              <p className="sources-loading">{text.loading}</p>
            ) : sourcesError ? (
              <p className="sources-error">{text.error}: {sourcesError}</p>
            ) : (
              sources.map((src) => (
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
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default About;