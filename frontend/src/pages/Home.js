import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

const Home = () => {
  const { language, t } = useLanguage();

  const cards = [
    {
      to: '/batch',
      title: t('home.uploadCard.title'),
      description: t('home.uploadCard.description'),
      button: t('home.uploadCard.button'),
    },
    {
      to: '/batch?mode=manual',
      title: t('home.manualCard.title'),
      description: t('home.manualCard.description'),
      button: t('home.manualCard.button'),
    },
    {
      to: '/search',
      title: t('home.mapCard.title'),
      description: t('home.mapCard.description'),
      button: t('home.mapCard.button'),
    },
  ];

  const features = [
    { title: t('home.features.multiApi'),  desc: t('home.features.multiApiDesc') },
    { title: t('home.features.filters'),   desc: t('home.features.filtersDesc') },
    { title: t('home.features.export'),    desc: t('home.features.exportDesc') },
    { title: t('home.features.bilingual'), desc: t('home.features.bilingualDesc') },
  ];

  const geocodingSources = [
    'Nominatim',
    'GeoNames',
    'OpenCage',
    'Google Maps',
    'Photon',
    'Mapcarta'
  ];

  return (
    <div className="home-page fade-in-up">
      <div className="container">

        {/* ── Action Cards ── */}
        <section className="action-cards">
          {cards.map((card) => (
            <Link key={card.to} to={card.to} className="action-card">
              <h2 className="card-title">{card.title}</h2>
              <p className="card-description">{card.description}</p>
              <span className="card-cta">{card.button}</span>
            </Link>
          ))}
        </section>

        {/* ── Features ── */}
        <section className="features-section">
          <h2 className="features-heading">{t('home.features.title')}</h2>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-description">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Coverage Banner ── */}
        <section className="coverage-banner">
          <div className="coverage-stat">
            <span className="coverage-number">54</span>
            <span className="coverage-label">
              {language === 'en' ? 'African Countries' : 'Pays Africains'}
            </span>
          </div>
          <div className="coverage-divider" />
          <div className="coverage-regions">
            {['North Africa', 'West Africa', 'Central Africa', 'East Africa', 'Southern Africa'].map(r => (
              <span key={r} className="region-pill">{r}</span>
            ))}
          </div>
        </section>

        {/* ── Powered By Section ── */}
        <section className="powered-by-section">
          <h3 className="powered-by-title">
            {language === 'en' ? 'Powered by' : 'Propulsé par'}
          </h3>
          <div className="powered-by-sources">
            {geocodingSources.map((source) => (
              <span key={source} className="source-pill">{source}</span>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;
