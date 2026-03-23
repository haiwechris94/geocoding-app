/**
 * API Documentation Page
 * Page de Documentation API
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ApiDocs.css';

const ApiDocs = () => {
  const { t, language } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [tryItOut, setTryItOut] = useState({
    endpoint: '',
    method: 'GET',
    body: '',
    response: null,
    loading: false,
    error: null
  });
  const [copiedCode, setCopiedCode] = useState(null);

  const translations = {
    en: {
      title: 'API Documentation',
      subtitle: 'Complete reference for the Geocoding API',
      search: 'Search documentation...',
      sections: {
        overview: 'Overview',
        authentication: 'Authentication',
        rateLimiting: 'Rate Limiting',
        errorCodes: 'Error Codes',
        endpoints: 'Endpoints',
        codeExamples: 'Code Examples',
        webhooks: 'Webhooks'
      },
      tryItOut: 'Try It Out',
      send: 'Send Request',
      response: 'Response',
      requestBody: 'Request Body',
      headers: 'Headers',
      parameters: 'Parameters',
      copyCode: 'Copy Code',
      copied: 'Copied!',
      baseUrl: 'Base URL',
      method: 'Method',
      endpoint: 'Endpoint',
      description: 'Description',
      required: 'Required',
      optional: 'Optional',
      example: 'Example',
      responseExample: 'Response Example',
      noResults: 'No matching documentation found',
      languages: {
        javascript: 'JavaScript',
        python: 'Python',
        curl: 'cURL',
        nodejs: 'Node.js'
      }
    },
    fr: {
      title: 'Documentation API',
      subtitle: 'Référence complète pour l\'API de Géocodage',
      search: 'Rechercher dans la documentation...',
      sections: {
        overview: 'Aperçu',
        authentication: 'Authentification',
        rateLimiting: 'Limitation de Débit',
        errorCodes: 'Codes d\'Erreur',
        endpoints: 'Points de Terminaison',
        codeExamples: 'Exemples de Code',
        webhooks: 'Webhooks'
      },
      tryItOut: 'Essayer',
      send: 'Envoyer la Requête',
      response: 'Réponse',
      requestBody: 'Corps de la Requête',
      headers: 'En-têtes',
      parameters: 'Paramètres',
      copyCode: 'Copier le Code',
      copied: 'Copié!',
      baseUrl: 'URL de Base',
      method: 'Méthode',
      endpoint: 'Point de Terminaison',
      description: 'Description',
      required: 'Requis',
      optional: 'Optionnel',
      example: 'Exemple',
      responseExample: 'Exemple de Réponse',
      noResults: 'Aucune documentation correspondante trouvée',
      languages: {
        javascript: 'JavaScript',
        python: 'Python',
        curl: 'cURL',
        nodejs: 'Node.js'
      }
    }
  };

  const text = translations[language];

  const endpoints = [
    {
      category: 'Health',
      items: [
        {
          method: 'GET',
          path: '/api/health',
          description: { en: 'Check API health status', fr: 'Vérifier l\'état de santé de l\'API' },
          params: [],
          response: {
            status: 'healthy',
            timestamp: '2024-01-15T10:30:00.000Z',
            uptime: 3600
          }
        }
      ]
    },
    {
      category: 'Geocoding',
      items: [
        {
          method: 'POST',
          path: '/api/geocoding/single',
          description: { en: 'Geocode a single village', fr: 'Géocoder un seul village' },
          params: [
            { name: 'villageName', type: 'string', required: true, description: { en: 'Name of the village', fr: 'Nom du village' } },
            { name: 'countryCode', type: 'string', required: false, description: { en: 'ISO country code', fr: 'Code pays ISO' } },
            { name: 'region', type: 'string', required: false, description: { en: 'Region name', fr: 'Nom de la région' } }
          ],
          body: {
            villageName: 'Yaoundé',
            countryCode: 'CM'
          },
          response: {
            success: true,
            data: {
              villageName: 'Yaoundé',
              latitude: 3.848,
              longitude: 11.5021,
              confidence: 0.95,
              source: 'nominatim'
            }
          }
        },
        {
          method: 'POST',
          path: '/api/geocoding/batch-manual',
          description: { en: 'Batch geocode villages from list', fr: 'Géocoder plusieurs villages depuis une liste' },
          params: [
            { name: 'villages', type: 'array', required: true, description: { en: 'Array of village names', fr: 'Tableau de noms de villages' } },
            { name: 'filters', type: 'object', required: false, description: { en: 'Geographic filters', fr: 'Filtres géographiques' } }
          ],
          body: {
            villages: ['Douala', 'Bamenda', 'Garoua'],
            filters: { countryCode: 'CM' }
          },
          response: {
            success: true,
            data: {
              total: 3,
              found: 3,
              notFound: 0,
              results: []
            }
          }
        },
        {
          method: 'POST',
          path: '/api/geocoding/upload',
          description: { en: 'Upload file for geocoding', fr: 'Télécharger un fichier pour le géocodage' },
          params: [
            { name: 'file', type: 'file', required: true, description: { en: 'Excel or CSV file', fr: 'Fichier Excel ou CSV' } }
          ],
          response: {
            success: true,
            data: {
              filePath: '/uploads/abc123.xlsx',
              columns: ['Name', 'Region'],
              rowCount: 150
            }
          }
        },
        {
          method: 'POST',
          path: '/api/geocoding/search-area',
          description: { en: 'Search villages within radius', fr: 'Rechercher des villages dans un rayon' },
          params: [
            { name: 'center', type: 'object', required: true, description: { en: 'Center coordinates {lat, lng}', fr: 'Coordonnées du centre {lat, lng}' } },
            { name: 'radius', type: 'number', required: false, description: { en: 'Search radius in km (default: 20)', fr: 'Rayon de recherche en km (défaut: 20)' } },
            { name: 'countryCode', type: 'string', required: false, description: { en: 'Filter by country', fr: 'Filtrer par pays' } }
          ],
          body: {
            center: { lat: 12.37, lng: -1.52 },
            radius: 20,
            countryCode: 'BF'
          },
          response: {
            success: true,
            data: {
              results: [],
              count: 25
            }
          }
        }
      ]
    },
    {
      category: 'Batch Processing',
      items: [
        {
          method: 'POST',
          path: '/api/geocoding/batch/upload',
          description: { en: 'Start batch processing job', fr: 'Démarrer un travail de traitement par lots' },
          params: [
            { name: 'file', type: 'file', required: true, description: { en: 'File to process', fr: 'Fichier à traiter' } },
            { name: 'columnName', type: 'string', required: true, description: { en: 'Column with village names', fr: 'Colonne avec les noms de villages' } }
          ],
          response: {
            success: true,
            data: {
              batchId: 'batch_abc123',
              status: 'processing'
            }
          }
        },
        {
          method: 'GET',
          path: '/api/geocoding/batch/:batchId/status',
          description: { en: 'Get batch job status', fr: 'Obtenir le statut du travail par lots' },
          params: [
            { name: 'batchId', type: 'string', required: true, description: { en: 'Batch job ID', fr: 'ID du travail par lots' } }
          ],
          response: {
            success: true,
            data: {
              status: 'processing',
              progress: { total: 100, processed: 45, percentage: 45 }
            }
          }
        },
        {
          method: 'GET',
          path: '/api/geocoding/batch/:batchId/results',
          description: { en: 'Get batch job results', fr: 'Obtenir les résultats du travail par lots' },
          params: [
            { name: 'batchId', type: 'string', required: true, description: { en: 'Batch job ID', fr: 'ID du travail par lots' } }
          ],
          response: {
            success: true,
            data: {
              status: 'completed',
              results: [],
              statistics: { total: 100, found: 85 }
            }
          }
        }
      ]
    },
    {
      category: 'Search History',
      items: [
        {
          method: 'GET',
          path: '/api/geocoding/history',
          description: { en: 'Get search history', fr: 'Obtenir l\'historique de recherche' },
          params: [
            { name: 'page', type: 'number', required: false, description: { en: 'Page number', fr: 'Numéro de page' } },
            { name: 'limit', type: 'number', required: false, description: { en: 'Results per page', fr: 'Résultats par page' } },
            { name: 'startDate', type: 'string', required: false, description: { en: 'Filter start date', fr: 'Date de début du filtre' } },
            { name: 'endDate', type: 'string', required: false, description: { en: 'Filter end date', fr: 'Date de fin du filtre' } }
          ],
          response: {
            success: true,
            data: {
              entries: [],
              pagination: { page: 1, total: 150 }
            }
          }
        },
        {
          method: 'GET',
          path: '/api/geocoding/history/stats',
          description: { en: 'Get search statistics', fr: 'Obtenir les statistiques de recherche' },
          params: [],
          response: {
            success: true,
            data: {
              totalSearches: 500,
              successRate: 0.85,
              avgConfidence: 0.78
            }
          }
        }
      ]
    },
    {
      category: 'AI Features',
      items: [
        {
          method: 'POST',
          path: '/api/geocoding/ai/recommend',
          description: { en: 'Get AI recommendations', fr: 'Obtenir les recommandations IA' },
          params: [
            { name: 'villageName', type: 'string', required: true, description: { en: 'Village name to analyze', fr: 'Nom du village à analyser' } },
            { name: 'countryCode', type: 'string', required: false, description: { en: 'Country code', fr: 'Code pays' } }
          ],
          body: {
            villageName: 'Yaounde',
            countryCode: 'CM'
          },
          response: {
            success: true,
            data: {
              recommendations: [{ suggestion: 'Yaoundé', confidence: 0.95 }]
            }
          }
        },
        {
          method: 'GET',
          path: '/api/geocoding/ai/status',
          description: { en: 'Check AI service status', fr: 'Vérifier le statut du service IA' },
          params: [],
          response: {
            success: true,
            data: {
              available: true,
              model: 'deepseek-chat'
            }
          }
        }
      ]
    }
  ];

  const codeExamples = {
    javascript: `// JavaScript (Fetch)
async function geocodeSingle(villageName, countryCode) {
  const response = await fetch('http://localhost:5000/api/geocoding/single', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'en'
    },
    body: JSON.stringify({ villageName, countryCode })
  });
  return await response.json();
}

// Usage
const result = await geocodeSingle('Yaoundé', 'CM');
console.log(result.data.latitude, result.data.longitude);`,

    python: `# Python (Requests)
import requests

BASE_URL = 'http://localhost:5000/api'

def geocode_single(village_name, country_code):
    response = requests.post(
        f'{BASE_URL}/geocoding/single',
        json={
            'villageName': village_name,
            'countryCode': country_code
        },
        headers={'Accept-Language': 'en'}
    )
    return response.json()

# Usage
result = geocode_single('Yaoundé', 'CM')
print(f"Coordinates: {result['data']['latitude']}, {result['data']['longitude']}")`,

    curl: `# cURL Examples

# Health check
curl http://localhost:5000/api/health

# Single geocoding
curl -X POST http://localhost:5000/api/geocoding/single \\
  -H "Content-Type: application/json" \\
  -d '{"villageName": "Yaoundé", "countryCode": "CM"}'

# Batch geocoding
curl -X POST http://localhost:5000/api/geocoding/batch-manual \\
  -H "Content-Type: application/json" \\
  -d '{"villages": ["Douala", "Bamenda"], "filters": {"countryCode": "CM"}}'

# File upload
curl -X POST http://localhost:5000/api/geocoding/upload \\
  -F "file=@villages.xlsx"`,

    nodejs: `// Node.js (Axios)
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

async function geocodeSingle(villageName, countryCode) {
  const { data } = await api.post('/geocoding/single', {
    villageName,
    countryCode
  });
  return data;
}

async function batchGeocode(villages, filters) {
  const { data } = await api.post('/geocoding/batch-manual', {
    villages,
    filters
  });
  return data;
}

// Usage
const result = await geocodeSingle('Yaoundé', 'CM');
console.log(result.data);`
  };

  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const handleTryItOut = async (endpoint) => {
    setTryItOut({
      endpoint: endpoint.path,
      method: endpoint.method,
      body: endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '',
      response: null,
      loading: true,
      error: null
    });

    try {
      const url = `http://localhost:5000${endpoint.path}`;
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language
        }
      };

      if (endpoint.method !== 'GET' && endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setTryItOut(prev => ({
        ...prev,
        response: data,
        loading: false
      }));
    } catch (error) {
      setTryItOut(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
    }
  };

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredEndpoints = endpoints.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description[language].toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const renderMethodBadge = (method) => {
    const colors = {
      GET: 'method-get',
      POST: 'method-post',
      PUT: 'method-put',
      DELETE: 'method-delete'
    };
    return <span className={`method-badge ${colors[method]}`}>{method}</span>;
  };

  return (
    <div className="api-docs-page">
      <div className="api-docs-sidebar">
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
            <li className={activeSection === 'overview' ? 'active' : ''}>
              <button onClick={() => setActiveSection('overview')}>
                {text.sections.overview}
              </button>
            </li>
            <li className={activeSection === 'authentication' ? 'active' : ''}>
              <button onClick={() => setActiveSection('authentication')}>
                {text.sections.authentication}
              </button>
            </li>
            <li className={activeSection === 'rateLimiting' ? 'active' : ''}>
              <button onClick={() => setActiveSection('rateLimiting')}>
                {text.sections.rateLimiting}
              </button>
            </li>
            <li className={activeSection === 'errorCodes' ? 'active' : ''}>
              <button onClick={() => setActiveSection('errorCodes')}>
                {text.sections.errorCodes}
              </button>
            </li>
            <li className={activeSection === 'endpoints' ? 'active' : ''}>
              <button onClick={() => setActiveSection('endpoints')}>
                {text.sections.endpoints}
              </button>
            </li>
            <li className={activeSection === 'codeExamples' ? 'active' : ''}>
              <button onClick={() => setActiveSection('codeExamples')}>
                {text.sections.codeExamples}
              </button>
            </li>
            <li className={activeSection === 'webhooks' ? 'active' : ''}>
              <button onClick={() => setActiveSection('webhooks')}>
                {text.sections.webhooks}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="api-docs-content">
        {activeSection === 'overview' && (
          <section className="docs-section">
            <h1>{text.title}</h1>
            <p className="subtitle">{text.subtitle}</p>
            
            <div className="info-card">
              <h3>{text.baseUrl}</h3>
              <code className="base-url">http://localhost:5000/api</code>
            </div>

            <div className="overview-grid">
              <div className="overview-card">
                <h4>🌍 Geocoding</h4>
                <p>{language === 'en' ? 'Geocode African villages with multiple data sources' : 'Géocodez les villages africains avec plusieurs sources de données'}</p>
              </div>
              <div className="overview-card">
                <h4>📦 Batch Processing</h4>
                <p>{language === 'en' ? 'Process large files with progress tracking' : 'Traitez de gros fichiers avec suivi de progression'}</p>
              </div>
              <div className="overview-card">
                <h4>🤖 AI Features</h4>
                <p>{language === 'en' ? 'Get intelligent recommendations and insights' : 'Obtenez des recommandations et insights intelligents'}</p>
              </div>
              <div className="overview-card">
                <h4>📊 Analytics</h4>
                <p>{language === 'en' ? 'Track search history and statistics' : 'Suivez l\'historique et les statistiques de recherche'}</p>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'authentication' && (
          <section className="docs-section">
            <h2>{text.sections.authentication}</h2>
            <div className="info-box">
              <p>
                {language === 'en' 
                  ? 'Currently, the API does not require authentication for basic usage. For production deployments, implement API key authentication.'
                  : 'Actuellement, l\'API ne nécessite pas d\'authentification pour une utilisation basique. Pour les déploiements en production, implémentez l\'authentification par clé API.'}
              </p>
            </div>
            <h3>{language === 'en' ? 'Future Authentication Header' : 'En-tête d\'Authentification Future'}</h3>
            <pre className="code-block">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </pre>
          </section>
        )}

        {activeSection === 'rateLimiting' && (
          <section className="docs-section">
            <h2>{text.sections.rateLimiting}</h2>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>{language === 'en' ? 'Endpoint Type' : 'Type de Point de Terminaison'}</th>
                  <th>{language === 'en' ? 'Requests' : 'Requêtes'}</th>
                  <th>{language === 'en' ? 'Window' : 'Fenêtre'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard API</td>
                  <td>100</td>
                  <td>15 minutes</td>
                </tr>
                <tr>
                  <td>Batch Processing</td>
                  <td>10</td>
                  <td>15 minutes</td>
                </tr>
                <tr>
                  <td>AI Features</td>
                  <td>50</td>
                  <td>15 minutes</td>
                </tr>
              </tbody>
            </table>

            <h3>{language === 'en' ? 'Response Headers' : 'En-têtes de Réponse'}</h3>
            <pre className="code-block">
              <code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`}</code>
            </pre>
          </section>
        )}

        {activeSection === 'errorCodes' && (
          <section className="docs-section">
            <h2>{text.sections.errorCodes}</h2>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>{language === 'en' ? 'Name' : 'Nom'}</th>
                  <th>{language === 'en' ? 'Description' : 'Description'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>400</td>
                  <td>BAD_REQUEST</td>
                  <td>{language === 'en' ? 'Invalid request parameters' : 'Paramètres de requête invalides'}</td>
                </tr>
                <tr>
                  <td>401</td>
                  <td>UNAUTHORIZED</td>
                  <td>{language === 'en' ? 'Authentication required' : 'Authentification requise'}</td>
                </tr>
                <tr>
                  <td>404</td>
                  <td>NOT_FOUND</td>
                  <td>{language === 'en' ? 'Resource not found' : 'Ressource non trouvée'}</td>
                </tr>
                <tr>
                  <td>429</td>
                  <td>RATE_LIMITED</td>
                  <td>{language === 'en' ? 'Too many requests' : 'Trop de requêtes'}</td>
                </tr>
                <tr>
                  <td>500</td>
                  <td>INTERNAL_ERROR</td>
                  <td>{language === 'en' ? 'Server error' : 'Erreur serveur'}</td>
                </tr>
              </tbody>
            </table>

            <h3>{language === 'en' ? 'Error Response Format' : 'Format de Réponse d\'Erreur'}</h3>
            <pre className="code-block">
              <code>{JSON.stringify({
                success: false,
                error: {
                  code: 'ERROR_CODE',
                  message: {
                    en: 'English error message',
                    fr: 'Message d\'erreur en français'
                  }
                }
              }, null, 2)}</code>
            </pre>
          </section>
        )}

        {activeSection === 'endpoints' && (
          <section className="docs-section">
            <h2>{text.sections.endpoints}</h2>
            
            {filteredEndpoints.length === 0 ? (
              <p className="no-results">{text.noResults}</p>
            ) : (
              filteredEndpoints.map((category, catIndex) => (
                <div key={catIndex} className="endpoint-category">
                  <h3>{category.category}</h3>
                  {category.items.map((endpoint, endIndex) => (
                    <div key={endIndex} className="endpoint-card">
                      <div className="endpoint-header">
                        {renderMethodBadge(endpoint.method)}
                        <code className="endpoint-path">{endpoint.path}</code>
                      </div>
                      <p className="endpoint-description">{endpoint.description[language]}</p>
                      
                      {endpoint.params.length > 0 && (
                        <div className="endpoint-params">
                          <h4>{text.parameters}</h4>
                          <table className="params-table">
                            <thead>
                              <tr>
                                <th>{language === 'en' ? 'Name' : 'Nom'}</th>
                                <th>Type</th>
                                <th>{language === 'en' ? 'Required' : 'Requis'}</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {endpoint.params.map((param, paramIndex) => (
                                <tr key={paramIndex}>
                                  <td><code>{param.name}</code></td>
                                  <td>{param.type}</td>
                                  <td>
                                    <span className={`required-badge ${param.required ? 'required' : 'optional'}`}>
                                      {param.required ? text.required : text.optional}
                                    </span>
                                  </td>
                                  <td>{param.description[language]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {endpoint.body && (
                        <div className="endpoint-body">
                          <h4>{text.requestBody}</h4>
                          <pre className="code-block">
                            <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                          </pre>
                        </div>
                      )}

                      <div className="endpoint-response">
                        <h4>{text.responseExample}</h4>
                        <pre className="code-block">
                          <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                        </pre>
                      </div>

                      <button 
                        className="try-it-btn"
                        onClick={() => handleTryItOut(endpoint)}
                        aria-label={`${text.tryItOut} ${endpoint.path}`}
                      >
                        {text.tryItOut}
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>
        )}

        {activeSection === 'codeExamples' && (
          <section className="docs-section">
            <h2>{text.sections.codeExamples}</h2>
            
            <div className="language-tabs">
              {Object.keys(codeExamples).map(lang => (
                <button
                  key={lang}
                  className={`language-tab ${selectedLanguage === lang ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {text.languages[lang]}
                </button>
              ))}
            </div>

            <div className="code-example">
              <div className="code-header">
                <span>{text.languages[selectedLanguage]}</span>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(codeExamples[selectedLanguage], selectedLanguage)}
                >
                  {copiedCode === selectedLanguage ? text.copied : text.copyCode}
                </button>
              </div>
              <pre className="code-block large">
                <code>{codeExamples[selectedLanguage]}</code>
              </pre>
            </div>
          </section>
        )}

        {activeSection === 'webhooks' && (
          <section className="docs-section">
            <h2>{text.sections.webhooks}</h2>
            <div className="info-box coming-soon">
              <h3>🚀 {language === 'en' ? 'Coming Soon' : 'Bientôt Disponible'}</h3>
              <p>
                {language === 'en'
                  ? 'Webhook support for batch processing notifications is under development.'
                  : 'Le support des webhooks pour les notifications de traitement par lots est en cours de développement.'}
              </p>
            </div>

            <h3>{language === 'en' ? 'Event Types' : 'Types d\'Événements'}</h3>
            <ul className="event-list">
              <li><code>batch_started</code> - {language === 'en' ? 'Batch processing has started' : 'Le traitement par lots a démarré'}</li>
              <li><code>batch_progress</code> - {language === 'en' ? 'Progress update (every 10%)' : 'Mise à jour de progression (tous les 10%)'}</li>
              <li><code>batch_completed</code> - {language === 'en' ? 'Batch processing completed' : 'Traitement par lots terminé'}</li>
              <li><code>batch_failed</code> - {language === 'en' ? 'Batch processing failed' : 'Échec du traitement par lots'}</li>
            </ul>

            <h3>{language === 'en' ? 'Webhook Payload Example' : 'Exemple de Payload Webhook'}</h3>
            <pre className="code-block">
              <code>{JSON.stringify({
                event: 'batch_completed',
                timestamp: '2024-01-15T10:30:00.000Z',
                data: {
                  batchId: 'batch_abc123',
                  status: 'completed',
                  statistics: {
                    total: 100,
                    found: 85,
                    notFound: 15
                  }
                },
                signature: 'sha256=...'
              }, null, 2)}</code>
            </pre>
          </section>
        )}

        {/* Try It Out Modal */}
        {tryItOut.endpoint && (
          <div className="try-it-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{text.tryItOut}: {tryItOut.endpoint}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setTryItOut({ ...tryItOut, endpoint: '' })}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="request-info">
                  <span className={`method-badge method-${tryItOut.method.toLowerCase()}`}>
                    {tryItOut.method}
                  </span>
                  <code>{tryItOut.endpoint}</code>
                </div>

                {tryItOut.body && (
                  <div className="request-body">
                    <h4>{text.requestBody}</h4>
                    <textarea
                      value={tryItOut.body}
                      onChange={(e) => setTryItOut({ ...tryItOut, body: e.target.value })}
                      rows={8}
                    />
                  </div>
                )}

                <div className="response-section">
                  <h4>{text.response}</h4>
                  {tryItOut.loading ? (
                    <div className="loading-spinner">Loading...</div>
                  ) : tryItOut.error ? (
                    <div className="error-message">{tryItOut.error}</div>
                  ) : tryItOut.response ? (
                    <pre className="response-code">
                      <code>{JSON.stringify(tryItOut.response, null, 2)}</code>
                    </pre>
                  ) : (
                    <p className="no-response">{language === 'en' ? 'Click Send to see response' : 'Cliquez sur Envoyer pour voir la réponse'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiDocs;
