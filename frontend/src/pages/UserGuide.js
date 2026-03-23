/**
 * User Guide Page
 * Page du Guide Utilisateur
 * 
 * Comprehensive user guide with:
 * - Getting Started
 * - Advanced Search Features
 * - Understanding Confidence Scores
 * - Using Batch Processing
 * - Analyzing Search History
 * - AI Features Guide
 * - Tips and Best Practices
 * - FAQ section
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './UserGuide.css';

const UserGuide = () => {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const translations = {
    en: {
      title: 'User Guide',
      subtitle: 'Learn how to use the Geocoding Application',
      search: 'Search guide...',
      sections: {
        gettingStarted: 'Getting Started',
        advancedSearch: 'Advanced Search',
        confidenceScores: 'Confidence Scores',
        batchProcessing: 'Batch Processing',
        searchHistory: 'Search History',
        aiFeatures: 'AI Features',
        tips: 'Tips & Best Practices',
        faq: 'FAQ'
      },
      videoTutorial: 'Video Tutorial',
      comingSoon: 'Coming Soon',
      watchVideo: 'Watch Video',
      readMore: 'Read More',
      backToTop: 'Back to Top'
    },
    fr: {
      title: 'Guide Utilisateur',
      subtitle: 'Apprenez à utiliser l\'Application de Géocodage',
      search: 'Rechercher dans le guide...',
      sections: {
        gettingStarted: 'Premiers Pas',
        advancedSearch: 'Recherche Avancée',
        confidenceScores: 'Scores de Confiance',
        batchProcessing: 'Traitement par Lots',
        searchHistory: 'Historique de Recherche',
        aiFeatures: 'Fonctionnalités IA',
        tips: 'Conseils & Bonnes Pratiques',
        faq: 'FAQ'
      },
      videoTutorial: 'Tutoriel Vidéo',
      comingSoon: 'Bientôt Disponible',
      watchVideo: 'Voir la Vidéo',
      readMore: 'En Savoir Plus',
      backToTop: 'Retour en Haut'
    }
  };

  const text = translations[language];

  const guideContent = {
    en: {
      'getting-started': {
        title: 'Getting Started',
        icon: '🚀',
        content: [
          {
            subtitle: 'Welcome to the Geocoding Application',
            text: 'This application helps you find geographic coordinates (latitude and longitude) for villages across 54 African countries. Whether you need to geocode a single location or process thousands of villages from a file, we\'ve got you covered.'
          },
          {
            subtitle: 'Quick Start Guide',
            steps: [
              'Navigate to the home page to see all available options',
              'Choose between Single Search, Batch Upload, or Map Search',
              'Enter your village name or upload your file',
              'Apply geographic filters to narrow down results',
              'View and export your results'
            ]
          },
          {
            subtitle: 'Navigation Overview',
            text: 'The main navigation bar provides access to all features:',
            list: [
              'Home - Overview and quick actions',
              'Batch Geocode - Process multiple villages',
              'Advanced Search - Map-based search with radius',
              'Batch Processing - Large file processing with progress tracking',
              'History - View and analyze past searches'
            ]
          }
        ]
      },
      'advanced-search': {
        title: 'Advanced Search Features',
        icon: '🔍',
        content: [
          {
            subtitle: 'Map-Based Search',
            text: 'The Advanced Search page allows you to search for villages using an interactive map. Click anywhere on the map to set a search center, then enter a village name to find locations within a specified radius.'
          },
          {
            subtitle: 'Using Geographic Filters',
            text: 'Improve your search accuracy by applying filters:',
            list: [
              'Country - Select from 54 African countries',
              'Region - Narrow down to a specific region',
              'Department - Further refine your search area',
              'Arrondissement - Most specific geographic filter'
            ]
          },
          {
            subtitle: 'Area Search',
            text: 'Find all villages within a radius of your selected point. This is useful for discovering nearby settlements or verifying location clusters.'
          },
          {
            subtitle: 'Search Tips',
            list: [
              'Use local spellings when possible',
              'Try alternative names if the first search fails',
              'Start with broader filters and narrow down',
              'Check the confidence score to verify accuracy'
            ]
          }
        ]
      },
      'confidence-scores': {
        title: 'Understanding Confidence Scores',
        icon: '🎯',
        content: [
          {
            subtitle: 'What is a Confidence Score?',
            text: 'The confidence score (0-100%) indicates how certain we are that the returned coordinates match your search query. Higher scores mean more reliable results.'
          },
          {
            subtitle: 'Score Breakdown',
            list: [
              'High (80-100%): Excellent match - coordinates are highly reliable',
              'Medium (50-79%): Good match - verify if possible',
              'Low (below 50%): Uncertain match - manual verification recommended'
            ]
          },
          {
            subtitle: 'Factors Affecting Confidence',
            text: 'Several factors influence the confidence score:',
            list: [
              'Name similarity - How closely the found name matches your query',
              'Source reliability - Different data sources have varying accuracy',
              'Geographic consistency - Results from multiple sources agreeing',
              'Filter matching - Whether results match your specified filters'
            ]
          },
          {
            subtitle: 'Improving Confidence',
            list: [
              'Use correct spelling and diacritics (é, è, ê, etc.)',
              'Apply geographic filters to narrow the search area',
              'Try the AI name suggestions for alternative spellings',
              'Verify low-confidence results on a map'
            ]
          }
        ]
      },
      'batch-processing': {
        title: 'Batch Processing Guide',
        icon: '📦',
        content: [
          {
            subtitle: 'Uploading Files',
            text: 'The batch processing feature allows you to geocode hundreds or thousands of villages at once. Supported file formats include Excel (.xlsx, .xls) and CSV (.csv).'
          },
          {
            subtitle: 'File Requirements',
            list: [
              'Maximum file size: 10MB',
              'One village name per row',
              'Column headers in the first row',
              'UTF-8 encoding recommended for special characters'
            ]
          },
          {
            subtitle: 'Processing Steps',
            steps: [
              'Upload your file using the file selector or drag-and-drop',
              'Select the column containing village names',
              'Apply optional geographic filters',
              'Click "Start Processing" to begin',
              'Monitor progress in real-time',
              'Download results when complete'
            ]
          },
          {
            subtitle: 'Understanding Results',
            text: 'After processing, you\'ll see statistics including:',
            list: [
              'Total villages processed',
              'Successfully geocoded count',
              'Not found count',
              'Average confidence score',
              'Processing time'
            ]
          },
          {
            subtitle: 'AI Analysis',
            text: 'Request an AI analysis of your batch results to get insights about patterns, quality issues, and recommendations for improving results.'
          }
        ]
      },
      'search-history': {
        title: 'Search History & Analytics',
        icon: '📊',
        content: [
          {
            subtitle: 'Viewing History',
            text: 'The Search History page shows all your past searches with details including the query, timestamp, result status, and confidence score.'
          },
          {
            subtitle: 'Filtering History',
            list: [
              'Filter by date range',
              'Filter by search type (single, batch, area)',
              'Filter by result status (found/not found)',
              'Search within your history'
            ]
          },
          {
            subtitle: 'Statistics Dashboard',
            text: 'View aggregated statistics about your searches:',
            list: [
              'Total searches over time',
              'Success rate trends',
              'Most searched countries',
              'Confidence score distribution'
            ]
          },
          {
            subtitle: 'AI Insights',
            text: 'Generate AI-powered insights from your search patterns to understand trends and get personalized recommendations.'
          },
          {
            subtitle: 'Exporting History',
            text: 'Export your search history in CSV or JSON format for external analysis or record-keeping.'
          }
        ]
      },
      'ai-features': {
        title: 'AI Features Guide',
        icon: '🤖',
        content: [
          {
            subtitle: 'AI-Powered Recommendations',
            text: 'Our AI assistant can help improve your search results by suggesting alternative spellings, explaining confidence scores, and providing context about locations.'
          },
          {
            subtitle: 'Name Suggestions',
            text: 'When a search returns low confidence or no results, the AI can suggest similar village names that might be what you\'re looking for.'
          },
          {
            subtitle: 'Confidence Explanations',
            text: 'Get detailed explanations of why a result has a particular confidence score, including which factors contributed positively or negatively.'
          },
          {
            subtitle: 'Batch Analysis',
            text: 'After batch processing, request an AI analysis to:',
            list: [
              'Identify patterns in your data',
              'Detect potential spelling issues',
              'Suggest improvements for failed searches',
              'Provide quality assessment'
            ]
          },
          {
            subtitle: 'Search Insights',
            text: 'The AI can analyze your search history to provide insights about your usage patterns and recommendations for more effective searching.'
          }
        ]
      },
      'tips': {
        title: 'Tips & Best Practices',
        icon: '💡',
        content: [
          {
            subtitle: 'Spelling and Names',
            list: [
              'Use local language spellings when known',
              'Include diacritical marks (accents) for French names',
              'Try both French and local language versions',
              'Check for common spelling variations'
            ]
          },
          {
            subtitle: 'Using Filters Effectively',
            list: [
              'Always specify the country when known',
              'Use region filters for common village names',
              'Start broad and narrow down if needed',
              'Filters significantly improve accuracy'
            ]
          },
          {
            subtitle: 'Batch Processing Tips',
            list: [
              'Clean your data before uploading',
              'Remove duplicates to save processing time',
              'Group villages by country for better results',
              'Review low-confidence results manually'
            ]
          },
          {
            subtitle: 'Verifying Results',
            list: [
              'Use the map view to visually verify locations',
              'Cross-reference with known landmarks',
              'Check if coordinates fall within expected region',
              'Compare with multiple sources when possible'
            ]
          },
          {
            subtitle: 'Performance Tips',
            list: [
              'Process large files during off-peak hours',
              'Split very large files into smaller batches',
              'Use filters to reduce search scope',
              'Export and save results promptly'
            ]
          }
        ]
      },
      'faq': {
        title: 'Frequently Asked Questions',
        icon: '❓',
        questions: [
          {
            q: 'What file formats are supported for batch upload?',
            a: 'We support Excel files (.xlsx, .xls) and CSV files (.csv). The maximum file size is 10MB.'
          },
          {
            q: 'Why is my village not found?',
            a: 'Villages may not be found due to spelling variations, missing data in our sources, or very small settlements. Try alternative spellings, use the AI suggestions, or broaden your geographic filters.'
          },
          {
            q: 'How accurate are the coordinates?',
            a: 'Accuracy varies by source and location. The confidence score indicates reliability. High confidence (>80%) results are typically accurate within a few hundred meters.'
          },
          {
            q: 'Can I edit the coordinates manually?',
            a: 'Yes, you can edit coordinates in the results table by clicking the edit button. This is useful for correcting or refining locations.'
          },
          {
            q: 'How long does batch processing take?',
            a: 'Processing time depends on the number of villages and server load. Typically, 100 villages take about 2-3 minutes. Large batches may take longer.'
          },
          {
            q: 'Is my data saved?',
            a: 'Search history is saved locally and can be exported. Uploaded files are processed and then deleted from our servers.'
          },
          {
            q: 'What countries are supported?',
            a: 'We support all 54 African countries with varying levels of data coverage. Coverage is best for major population centers.'
          },
          {
            q: 'How do I report incorrect data?',
            a: 'If you find incorrect coordinates, you can edit them in your results. For systematic issues, please contact support.'
          },
          {
            q: 'Can I use the API directly?',
            a: 'Yes, we provide a REST API for programmatic access. See the API Documentation page for details and examples.'
          },
          {
            q: 'Is there a limit on searches?',
            a: 'There are rate limits to ensure fair usage: 100 requests per 15 minutes for standard API calls. Batch processing has separate limits.'
          }
        ]
      }
    },
    fr: {
      'getting-started': {
        title: 'Premiers Pas',
        icon: '🚀',
        content: [
          {
            subtitle: 'Bienvenue dans l\'Application de Géocodage',
            text: 'Cette application vous aide à trouver les coordonnées géographiques (latitude et longitude) des villages dans 54 pays africains. Que vous ayez besoin de géocoder un seul emplacement ou de traiter des milliers de villages à partir d\'un fichier, nous avons ce qu\'il vous faut.'
          },
          {
            subtitle: 'Guide de Démarrage Rapide',
            steps: [
              'Accédez à la page d\'accueil pour voir toutes les options disponibles',
              'Choisissez entre Recherche Simple, Téléchargement par Lots ou Recherche sur Carte',
              'Entrez le nom de votre village ou téléchargez votre fichier',
              'Appliquez des filtres géographiques pour affiner les résultats',
              'Visualisez et exportez vos résultats'
            ]
          },
          {
            subtitle: 'Aperçu de la Navigation',
            text: 'La barre de navigation principale donne accès à toutes les fonctionnalités:',
            list: [
              'Accueil - Aperçu et actions rapides',
              'Géocodage par Lots - Traiter plusieurs villages',
              'Recherche Avancée - Recherche sur carte avec rayon',
              'Traitement par Lots - Traitement de gros fichiers avec suivi de progression',
              'Historique - Voir et analyser les recherches passées'
            ]
          }
        ]
      },
      // ... (French translations for other sections would follow the same pattern)
    }
  };

  const content = guideContent[language] || guideContent.en;
  const currentSection = content[activeSection];

  // Filter content based on search
  const filteredSections = Object.entries(content).filter(([key, section]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title?.toLowerCase().includes(query) ||
      JSON.stringify(section.content || section.questions).toLowerCase().includes(query)
    );
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="user-guide-page">
      <div className="guide-sidebar">
        <h2>{text.title}</h2>
        <div className="sidebar-search">
          <input
            type="text"
            placeholder={text.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={text.search}
          />
        </div>
        <nav className="sidebar-nav">
          <ul>
            {Object.entries(text.sections).map(([key, label]) => (
              <li key={key} className={activeSection === key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') ? 'active' : ''}>
                <button onClick={() => setActiveSection(key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''))}>
                  {content[key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')]?.icon} {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="guide-content">
        {currentSection && (
          <article className="guide-section">
            <header className="section-header">
              <span className="section-icon">{currentSection.icon}</span>
              <h1>{currentSection.title}</h1>
            </header>

            {/* Video Tutorial Placeholder */}
            <div className="video-placeholder">
              <div className="video-icon">🎬</div>
              <h3>{text.videoTutorial}</h3>
              <p>{text.comingSoon}</p>
            </div>

            {/* Content Sections */}
            {currentSection.content && currentSection.content.map((item, index) => (
              <section key={index} className="content-block">
                <h2>{item.subtitle}</h2>
                {item.text && <p>{item.text}</p>}
                {item.steps && (
                  <ol className="steps-list">
                    {item.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
                {item.list && (
                  <ul className="feature-list">
                    {item.list.map((listItem, i) => (
                      <li key={i}>{listItem}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* FAQ Section */}
            {currentSection.questions && (
              <div className="faq-section">
                {currentSection.questions.map((faq, index) => (
                  <div 
                    key={index} 
                    className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
                  >
                    <button 
                      className="faq-question"
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      aria-expanded={expandedFaq === index}
                    >
                      <span>{faq.q}</span>
                      <span className="faq-toggle">{expandedFaq === index ? '−' : '+'}</span>
                    </button>
                    {expandedFaq === index && (
                      <div className="faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button className="back-to-top" onClick={scrollToTop}>
              ↑ {text.backToTop}
            </button>
          </article>
        )}
      </div>
    </div>
  );
};

export default UserGuide;
