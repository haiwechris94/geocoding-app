/**
 * About Page — À propos de
 * Sources status: operational + active/inactive + what's missing
 * Auto-refreshes every 30 seconds
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './About.css';

// What each inactive source needs to become active
const SOURCE_REQUIREMENTS = {
  en: {
    nominatim:  null, // always free
    geonames:   'Add GEONAMES_USERNAME to backend environment variables (free at geonames.org)',
    opencage:   'Add OPENCAGE_API_KEY to backend environment variables (free tier at opencagedata.com)',
    photon:     null, // always free
    overpass:   null, // always free
    wikidata:   null, // always free
    brave:      'Add BRAVE_SEARCH_API_KEY to backend environment variables (free at api.search.brave.com)',
    google:     'Add GOOGLE_MAPS_API_KEY to backend environment variables (paid, console.cloud.google.com)',
    locationiq:  'Add LOCATIONIQ_API_KEY to backend environment variables (free tier at locationiq.com)',
    geoagent:   'Add DEEPSEEK_API_KEY to backend environment variables (free tier at platform.deepseek.com)',
  },
  fr: {
    nominatim:  null,
    geonames:   'Ajoutez GEONAMES_USERNAME dans les variables d\'environnement backend (gratuit sur geonames.org)',
    opencage:   'Ajoutez OPENCAGE_API_KEY dans les variables d\'environnement backend (gratuit sur opencagedata.com)',
    photon:     null,
    overpass:   null,
    wikidata:   null,
    brave:      'Ajoutez BRAVE_SEARCH_API_KEY dans les variables d\'environnement backend (gratuit sur api.search.brave.com)',
    google:     'Ajoutez GOOGLE_MAPS_API_KEY dans les variables d\'environnement backend (payant, console.cloud.google.com)',
    locationiq:  'Ajoutez LOCATIONIQ_API_KEY dans les variables d\'environnement backend (gratuit sur locationiq.com)',
    geoagent:   'Ajoutez DEEPSEEK_API_KEY dans les variables d\'environnement backend (gratuit sur platform.deepseek.com)',
  }
};

const About = () => {
  const { language } = useLanguage();
  const lang = language || 'fr';
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

  const fetchSources = useCallback(async () => {
    try {
      setSourcesError(null);
      const res = await fetch(`${API_BASE}/api/sources/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setSources(json.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err) {
      setSourcesError(err.message);
    } finally {
      setLoadingSources(false);
    }
  }, [API_BASE]);

  // Initial fetch + auto-refresh every 30s
  useEffect(() => {
    fetchSources();
    const interval = setInterval(fetchSources, 30000);
    return () => clearInterval(interval);
  }, [fetchSources]);

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
      geocodingSourcesDesc: 'List of all geocoding data sources, their operational and active status.',
      operational: 'Operational',
      notOperational: 'Not operational',
      active: 'Active',
      inactive: 'Inactive',
      reliability: 'Reliability',
      loading: 'Loading sources…',
      error: 'Unable to load sources',
      missingLabel: 'To activate:',
      lastUpdated: 'Last updated',
      refreshNow: 'Refresh',
      free: 'Free',
      apiKey: 'API Key required',
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
      geocodingSourcesDesc: 'Liste de toutes les sources de données de géocodage, leur statut opérationnel et leur activité.',
      operational: 'Opérationnel',
      notOperational: 'Non opérationnel',
      active: 'Actif',
      inactive: 'Inactif',
      reliability: 'Fiabilité',
      loading: 'Chargement des sources…',
      error: 'Impossible de charger les sources',
      missingLabel: 'Pour activer :',
      lastUpdated: 'Mis à jour',
      refreshNow: 'Actualiser',
      free: 'Gratuit',
      apiKey: 'Clé API requise',
    },
  };

  const text = t[lang] || t.fr;
  const requirements = SOURCE_REQUIREMENTS[lang] || SOURCE_REQUIREMENTS.fr;

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="about-page">
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
        <div className="sources-header-row">
          <button
            className="sources-toggle"
            onClick={() => setSourcesOpen(o => !o)}
            aria-expanded={sourcesOpen}
          >
            <span className="about-section-title">{text.geocodingSources}</span>
            <span className={`chevron ${sourcesOpen ? 'open' : ''}`}>▾</span>
          </button>
          <div className="sources-refresh">
            {lastUpdated && (
              <span className="sources-last-updated">
                🕐 {text.lastUpdated}: {formatTime(lastUpdated)}
              </span>
            )}
            <button className="btn-refresh" onClick={fetchSources} title={text.refreshNow}>
              🔄
            </button>
          </div>
        </div>
        <p className="sources-desc">{text.geocodingSourcesDesc}</p>

        {sourcesOpen && (
          <div className="sources-list">
            {loadingSources ? (
              <p className="sources-loading">{text.loading}</p>
            ) : sourcesError ? (
              <p className="sources-error">{text.error}: {sourcesError}</p>
            ) : (
              sources.map((src) => {
                const isActive = src.operational && src.enabled !== false;
                const missingInfo = !isActive ? (requirements[src.id] || null) : null;

                return (
                  <div
                    key={src.id}
                    className={`source-row ${src.operational ? 'op' : 'nop'} ${isActive ? 'source-active' : 'source-inactive'}`}
                  >
                    <div className="source-main">
                      <span className="source-name">{src.name}</span>
                      {src.reliability !== null && src.reliability !== undefined && (
                        <span className="source-reliability">
                          {text.reliability}: {src.reliability > 1
                            ? Math.round(src.reliability)
                            : Math.round(src.reliability * 100)}%
                        </span>
                      )}
                    </div>

                    <div className="source-right">
                      {/* Operational badge */}
                      <span className={`status-badge ${src.operational ? 'operational' : 'not-operational'}`}>
                        <span className="status-dot"></span>
                        {src.operational ? text.operational : text.notOperational}
                      </span>

                      {/* Active/Inactive badge */}
                      <span className={`status-badge ${isActive ? 'active-badge' : 'inactive-badge'}`}>
                        <span className="status-dot"></span>
                        {isActive ? text.active : text.inactive}
                      </span>

                      {/* Reason if not operational */}
                      {!src.operational && src.reason && (
                        <span className="source-reason">
                          {typeof src.reason === 'object'
                            ? (src.reason[lang] || src.reason.fr || src.reason.en)
                            : src.reason}
                        </span>
                      )}
                    </div>

                    {/* What's missing to activate */}
                    {!isActive && missingInfo && (
                      <div className="source-missing">
                        <span className="missing-label">💡 {text.missingLabel}</span>
                        <span className="missing-text">{missingInfo}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default About;
