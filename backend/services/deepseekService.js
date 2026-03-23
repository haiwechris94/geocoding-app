/**
 * DeepSeek AI Service
 * Service d'IA DeepSeek
 * 
 * AI-powered recommendations, name suggestions, and confidence explanations.
 * Recommandations alimentées par l'IA, suggestions de noms et explications de confiance.
 */

const axios = require('axios');
const { apiConfig } = require('../config/apiConfig');

const deepseekConfig = apiConfig.deepseek;

/**
 * Create axios instance for DeepSeek API
 */
const deepseekClient = axios.create({
  baseURL: deepseekConfig.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${deepseekConfig.apiKey}`,
    'HTTP-Referer': 'https://geocoding-app.local',
    'X-Title': 'African Village Geocoding App'
  }
});

/**
 * Send a chat completion request to DeepSeek
 * Envoyer une requête de complétion de chat à DeepSeek
 * 
 * @param {string} systemPrompt - System prompt for context
 * @param {string} userMessage - User message/query
 * @param {string} language - Response language ('en' or 'fr')
 * @returns {Promise<string>} AI response
 */
const sendChatRequest = async (systemPrompt, userMessage, language = 'en') => {
  if (!deepseekConfig.enabled) {
    throw new Error(language === 'fr' 
      ? 'Le service DeepSeek AI n\'est pas configuré' 
      : 'DeepSeek AI service is not configured');
  }

  try {
    const response = await deepseekClient.post('/chat/completions', {
      model: deepseekConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: deepseekConfig.maxTokens,
      temperature: deepseekConfig.temperature
    });

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
    throw new Error(language === 'fr'
      ? 'Erreur lors de la communication avec l\'IA'
      : 'Error communicating with AI service');
  }
};

/**
 * Get search recommendations based on user query
 * Obtenir des recommandations de recherche basées sur la requête utilisateur
 * 
 * @param {string} query - User's search query
 * @param {Object} context - Search context (country, region, etc.)
 * @param {string} language - Response language
 * @returns {Promise<Object>} Recommendations object
 */
const getSearchRecommendations = async (query, context = {}, language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un assistant expert en géographie africaine et en géocodage de villages. 
       Tu aides les utilisateurs à trouver des villages en Afrique.
       Réponds toujours en français avec des suggestions pratiques et précises.
       Format ta réponse en JSON avec les clés: recommendations (array), tips (array), alternativeSearches (array).`
    : `You are an expert assistant in African geography and village geocoding.
       You help users find villages across Africa.
       Always respond in English with practical and precise suggestions.
       Format your response as JSON with keys: recommendations (array), tips (array), alternativeSearches (array).`;

  const userMessage = language === 'fr'
    ? `L'utilisateur recherche: "${query}"
       Contexte: ${JSON.stringify(context)}
       
       Fournis des recommandations pour améliorer cette recherche de village africain.
       Inclus des conseils sur l'orthographe, les variations de noms locaux, et les régions probables.`
    : `User is searching for: "${query}"
       Context: ${JSON.stringify(context)}
       
       Provide recommendations to improve this African village search.
       Include tips about spelling, local name variations, and probable regions.`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    // Try to parse JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // If JSON parsing fails, return structured response
    }

    return {
      recommendations: [response],
      tips: [],
      alternativeSearches: []
    };
  } catch (error) {
    console.error('Error getting search recommendations:', error);
    throw error;
  }
};

/**
 * Suggest corrections for misspelled village names
 * Suggérer des corrections pour les noms de villages mal orthographiés
 * 
 * @param {string} villageName - Original village name
 * @param {string} countryCode - Country code for context
 * @param {Array} similarNames - Similar names found by APIs
 * @param {string} language - Response language
 * @returns {Promise<Object>} Name suggestions
 */
const suggestNameCorrections = async (villageName, countryCode = '', similarNames = [], language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en toponymie africaine. Tu connais les variations orthographiques 
       des noms de villages en Afrique, incluant les transcriptions coloniales françaises et anglaises,
       les noms locaux dans différentes langues africaines, et les erreurs courantes.
       Réponds en JSON avec: suggestions (array d'objets avec name, confidence, reason), 
       possibleLanguages (array), spellingTips (array).`
    : `You are an expert in African toponymy. You know spelling variations of village names 
       in Africa, including French and English colonial transcriptions, local names in 
       different African languages, and common errors.
       Respond in JSON with: suggestions (array of objects with name, confidence, reason),
       possibleLanguages (array), spellingTips (array).`;

  const userMessage = language === 'fr'
    ? `Nom de village recherché: "${villageName}"
       Pays: ${countryCode || 'Non spécifié'}
       Noms similaires trouvés par les APIs: ${similarNames.join(', ') || 'Aucun'}
       
       Suggère des corrections orthographiques possibles et des variations de ce nom de village.
       Considère les langues locales, les transcriptions coloniales, et les erreurs de frappe courantes.`
    : `Village name searched: "${villageName}"
       Country: ${countryCode || 'Not specified'}
       Similar names found by APIs: ${similarNames.join(', ') || 'None'}
       
       Suggest possible spelling corrections and variations of this village name.
       Consider local languages, colonial transcriptions, and common typos.`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return structured response if parsing fails
    }

    return {
      suggestions: [{ name: villageName, confidence: 0.5, reason: response }],
      possibleLanguages: [],
      spellingTips: []
    };
  } catch (error) {
    console.error('Error suggesting name corrections:', error);
    throw error;
  }
};

/**
 * Provide context about search results
 * Fournir du contexte sur les résultats de recherche
 * 
 * @param {Object} result - Geocoding result
 * @param {string} originalQuery - Original search query
 * @param {string} language - Response language
 * @returns {Promise<Object>} Context information
 */
const provideResultContext = async (result, originalQuery, language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en géographie africaine. Fournis du contexte utile sur les résultats 
       de géocodage, incluant des informations sur la région, l'histoire, et la fiabilité du résultat.
       Réponds en JSON avec: context (string), regionInfo (string), reliability (string), 
       additionalNotes (array).`
    : `You are an expert in African geography. Provide useful context about geocoding results,
       including information about the region, history, and result reliability.
       Respond in JSON with: context (string), regionInfo (string), reliability (string),
       additionalNotes (array).`;

  const userMessage = language === 'fr'
    ? `Requête originale: "${originalQuery}"
       Résultat trouvé: ${JSON.stringify(result)}
       
       Fournis du contexte sur ce résultat de géocodage. Est-ce que le résultat semble correct?
       Quelles informations supplémentaires peux-tu fournir sur cette localisation?`
    : `Original query: "${originalQuery}"
       Result found: ${JSON.stringify(result)}
       
       Provide context about this geocoding result. Does the result seem correct?
       What additional information can you provide about this location?`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return structured response if parsing fails
    }

    return {
      context: response,
      regionInfo: '',
      reliability: '',
      additionalNotes: []
    };
  } catch (error) {
    console.error('Error providing result context:', error);
    throw error;
  }
};

/**
 * Explain confidence scores in detail
 * Expliquer les scores de confiance en détail
 * 
 * @param {Object} confidenceDetails - Confidence breakdown details
 * @param {string} villageName - Village name searched
 * @param {string} language - Response language
 * @returns {Promise<Object>} Detailed explanation
 */
const explainConfidence = async (confidenceDetails, villageName, language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en géocodage. Explique les scores de confiance de manière claire et accessible.
       Aide l'utilisateur à comprendre pourquoi un résultat a un certain niveau de confiance.
       Réponds en JSON avec: explanation (string), factors (array d'objets avec factor, score, explanation),
       recommendations (array), shouldVerify (boolean).`
    : `You are a geocoding expert. Explain confidence scores in a clear and accessible way.
       Help the user understand why a result has a certain confidence level.
       Respond in JSON with: explanation (string), factors (array of objects with factor, score, explanation),
       recommendations (array), shouldVerify (boolean).`;

  const userMessage = language === 'fr'
    ? `Village recherché: "${villageName}"
       Détails de confiance: ${JSON.stringify(confidenceDetails)}
       
       Explique ces scores de confiance de manière simple. Pourquoi le score est-il élevé ou bas?
       Que peut faire l'utilisateur pour améliorer la confiance dans ce résultat?`
    : `Village searched: "${villageName}"
       Confidence details: ${JSON.stringify(confidenceDetails)}
       
       Explain these confidence scores in simple terms. Why is the score high or low?
       What can the user do to improve confidence in this result?`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return structured response if parsing fails
    }

    return {
      explanation: response,
      factors: [],
      recommendations: [],
      shouldVerify: confidenceDetails.overall < 0.7
    };
  } catch (error) {
    console.error('Error explaining confidence:', error);
    throw error;
  }
};

/**
 * Check if DeepSeek service is available
 * Vérifier si le service DeepSeek est disponible
 * 
 * @returns {Promise<Object>} Service status
 */
const checkStatus = async () => {
  return {
    enabled: deepseekConfig.enabled,
    available: deepseekConfig.enabled && !!deepseekConfig.apiKey,
    model: deepseekConfig.model
  };
};

/**
 * Analyze batch geocoding results
 * Analyser les résultats de géocodage par lots
 * 
 * @param {Array} results - Batch results
 * @param {Object} statistics - Batch statistics
 * @param {Object} filters - Filters used
 * @param {string} language - Response language
 * @returns {Promise<Object>} Analysis results
 */
const analyzeBatchResults = async (results, statistics, filters = {}, language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en analyse de données géographiques. Analyse les résultats de géocodage par lots
       et fournis des insights utiles sur les patterns, les problèmes potentiels et les recommandations.
       Réponds en JSON avec: summary (string), patterns (array), issues (array), recommendations (array),
       qualityScore (number 0-100).`
    : `You are an expert in geographic data analysis. Analyze batch geocoding results
       and provide useful insights about patterns, potential issues, and recommendations.
       Respond in JSON with: summary (string), patterns (array), issues (array), recommendations (array),
       qualityScore (number 0-100).`;

  const sampleResults = results.slice(0, 20); // Sample for analysis
  
  const userMessage = language === 'fr'
    ? `Statistiques du lot:
       - Total: ${statistics.total}
       - Trouvés: ${statistics.found}
       - Non trouvés: ${statistics.notFound}
       - Taux de réussite: ${statistics.successRate}%
       - Confiance faible: ${statistics.lowConfidence}
       
       Filtres utilisés: ${JSON.stringify(filters)}
       
       Échantillon de résultats: ${JSON.stringify(sampleResults)}
       
       Analyse ces résultats et fournis des insights sur la qualité des données,
       les patterns observés et des recommandations pour améliorer les résultats.`
    : `Batch statistics:
       - Total: ${statistics.total}
       - Found: ${statistics.found}
       - Not found: ${statistics.notFound}
       - Success rate: ${statistics.successRate}%
       - Low confidence: ${statistics.lowConfidence}
       
       Filters used: ${JSON.stringify(filters)}
       
       Sample results: ${JSON.stringify(sampleResults)}
       
       Analyze these results and provide insights about data quality,
       observed patterns, and recommendations to improve results.`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return structured response if parsing fails
    }

    return {
      summary: response,
      patterns: [],
      issues: [],
      recommendations: [],
      qualityScore: statistics.successRate
    };
  } catch (error) {
    console.error('Error analyzing batch results:', error);
    throw error;
  }
};

/**
 * Generate insights from historical search data
 * Générer des insights à partir des données historiques de recherche
 * 
 * @param {Array} history - Search history entries
 * @param {Object} stats - Statistics
 * @param {string} language - Response language
 * @returns {Promise<Object>} Historical insights
 */
const generateHistoricalInsights = async (history, stats, language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en analyse de données de recherche. Analyse l'historique de recherche
       et fournis des insights sur les tendances, les comportements et des recommandations.
       Réponds en JSON avec: insights (array d'objets avec type et message), 
       recommendations (array), trends (array), predictedNeeds (array).`
    : `You are an expert in search data analysis. Analyze search history
       and provide insights about trends, behaviors, and recommendations.
       Respond in JSON with: insights (array of objects with type and message),
       recommendations (array), trends (array), predictedNeeds (array).`;

  const recentHistory = history.slice(0, 50);
  
  const userMessage = language === 'fr'
    ? `Statistiques de recherche:
       - Total des recherches: ${stats.totalSearches}
       - Taux de réussite: ${stats.successRate}%
       - Confiance moyenne: ${stats.averageConfidence}%
       - Localisations les plus recherchées: ${JSON.stringify(stats.mostSearchedLocations)}
       - Recherches par type: ${JSON.stringify(stats.searchesByType)}
       - Recherches par pays: ${JSON.stringify(stats.searchesByCountry)}
       
       Historique récent: ${JSON.stringify(recentHistory)}
       
       Analyse ces données et fournis des insights sur les patterns de recherche,
       les tendances et des recommandations pour améliorer l'expérience utilisateur.`
    : `Search statistics:
       - Total searches: ${stats.totalSearches}
       - Success rate: ${stats.successRate}%
       - Average confidence: ${stats.averageConfidence}%
       - Most searched locations: ${JSON.stringify(stats.mostSearchedLocations)}
       - Searches by type: ${JSON.stringify(stats.searchesByType)}
       - Searches by country: ${JSON.stringify(stats.searchesByCountry)}
       
       Recent history: ${JSON.stringify(recentHistory)}
       
       Analyze this data and provide insights about search patterns,
       trends, and recommendations to improve user experience.`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return structured response if parsing fails
    }

    return {
      insights: [{ type: 'info', message: response }],
      recommendations: [],
      trends: [],
      predictedNeeds: []
    };
  } catch (error) {
    console.error('Error generating historical insights:', error);
    throw error;
  }
};

/**
 * Predict search success likelihood
 * Prédire la probabilité de succès d'une recherche
 * 
 * @param {string} query - Search query
 * @param {Object} filters - Search filters
 * @param {Array} history - Recent search history
 * @param {string} language - Response language
 * @returns {Promise<Object>} Prediction results
 */
const predictSearchSuccess = async (query, filters = {}, history = [], language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en prédiction de géocodage. Basé sur la requête et l'historique,
       prédit la probabilité de succès de cette recherche.
       Réponds en JSON avec: likelihood (number 0-100), confidence (string: high/medium/low),
       factors (array), suggestions (array).`
    : `You are a geocoding prediction expert. Based on the query and history,
       predict the likelihood of success for this search.
       Respond in JSON with: likelihood (number 0-100), confidence (string: high/medium/low),
       factors (array), suggestions (array).`;

  const similarSearches = history.filter(h => 
    h.query && h.query.toLowerCase().includes(query.toLowerCase().substring(0, 3))
  ).slice(0, 10);
  
  const userMessage = language === 'fr'
    ? `Requête de recherche: "${query}"
       Filtres: ${JSON.stringify(filters)}
       Recherches similaires passées: ${JSON.stringify(similarSearches)}
       
       Prédit la probabilité de succès de cette recherche et fournis des suggestions.`
    : `Search query: "${query}"
       Filters: ${JSON.stringify(filters)}
       Similar past searches: ${JSON.stringify(similarSearches)}
       
       Predict the likelihood of success for this search and provide suggestions.`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return default prediction if parsing fails
    }

    return {
      likelihood: 50,
      confidence: 'medium',
      factors: [response],
      suggestions: []
    };
  } catch (error) {
    console.error('Error predicting search success:', error);
    throw error;
  }
};

/**
 * Suggest optimal search strategy
 * Suggérer une stratégie de recherche optimale
 * 
 * @param {string} query - Search query
 * @param {Object} context - Search context
 * @param {Array} history - Search history
 * @param {string} language - Response language
 * @returns {Promise<Object>} Strategy suggestions
 */
const suggestSearchStrategy = async (query, context = {}, history = [], language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en stratégie de recherche géographique. Suggère la meilleure stratégie
       pour trouver cette localisation basé sur le contexte et l'historique.
       Réponds en JSON avec: strategy (string), steps (array), filters (object avec suggestions),
       alternativeQueries (array), estimatedSuccessRate (number).`
    : `You are a geographic search strategy expert. Suggest the best strategy
       to find this location based on context and history.
       Respond in JSON with: strategy (string), steps (array), filters (object with suggestions),
       alternativeQueries (array), estimatedSuccessRate (number).`;

  const userMessage = language === 'fr'
    ? `Recherche: "${query}"
       Contexte actuel: ${JSON.stringify(context)}
       Historique récent: ${JSON.stringify(history.slice(0, 20))}
       
       Suggère la meilleure stratégie pour trouver cette localisation.`
    : `Search: "${query}"
       Current context: ${JSON.stringify(context)}
       Recent history: ${JSON.stringify(history.slice(0, 20))}
       
       Suggest the best strategy to find this location.`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Return default strategy if parsing fails
    }

    return {
      strategy: response,
      steps: [],
      filters: {},
      alternativeQueries: [],
      estimatedSuccessRate: 50
    };
  } catch (error) {
    console.error('Error suggesting search strategy:', error);
    throw error;
  }
};

/**
 * Get village information using AI
 * Obtenir des informations sur un village avec l'IA
 * 
 * @param {string} villageName - Name of the village
 * @param {number} latitude - Latitude of the village
 * @param {number} longitude - Longitude of the village
 * @param {string} language - Response language ('en' or 'fr')
 * @returns {Promise<Object>} Village information
 */
const getVillageInformation = async (villageName, latitude, longitude, language = 'en') => {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en géographie africaine et en histoire locale. Tu fournis des informations 
       détaillées et précises sur les villages africains, incluant leur histoire, population, 
       groupes ethniques, points d'intérêt et contexte culturel.
       Réponds en JSON avec les clés: villageName (string), location (object avec region, country, coordinates),
       population (object avec estimate, year, source), indigenousGroups (array), 
       historicalNotes (array), landmarks (array), culturalContext (string), 
       economicActivities (array), accessibility (string), additionalInfo (string).
       Si tu n'as pas d'informations fiables, indique-le clairement.`
    : `You are an expert in African geography and local history. You provide detailed and accurate 
       information about African villages, including their history, population, ethnic groups, 
       points of interest, and cultural context.
       Respond in JSON with keys: villageName (string), location (object with region, country, coordinates),
       population (object with estimate, year, source), indigenousGroups (array), 
       historicalNotes (array), landmarks (array), culturalContext (string), 
       economicActivities (array), accessibility (string), additionalInfo (string).
       If you don't have reliable information, clearly indicate that.`;

  const userMessage = language === 'fr'
    ? `Fournis des informations détaillées sur le village suivant:
       
       Nom du village: "${villageName}"
       Coordonnées: Latitude ${latitude}, Longitude ${longitude}
       
       Inclus:
       - Localisation précise (région, pays)
       - Estimation de la population si disponible
       - Groupes ethniques/indigènes présents
       - Notes historiques importantes
       - Points d'intérêt ou monuments
       - Contexte culturel
       - Activités économiques principales
       - Accessibilité (routes, transport)
       
       Si certaines informations ne sont pas disponibles, indique "Information non disponible".`
    : `Provide detailed information about the following village:
       
       Village name: "${villageName}"
       Coordinates: Latitude ${latitude}, Longitude ${longitude}
       
       Include:
       - Precise location (region, country)
       - Population estimate if available
       - Indigenous/ethnic groups present
       - Important historical notes
       - Points of interest or landmarks
       - Cultural context
       - Main economic activities
       - Accessibility (roads, transport)
       
       If certain information is not available, indicate "Information not available".`;

  try {
    const response = await sendChatRequest(systemPrompt, userMessage, language);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: {
            ...parsed,
            coordinates: { latitude, longitude },
            queriedName: villageName
          }
        };
      }
    } catch (parseError) {
      // Return structured response if parsing fails
    }

    return {
      success: true,
      data: {
        villageName,
        coordinates: { latitude, longitude },
        location: { region: 'Unknown', country: 'Unknown' },
        population: { estimate: 'Unknown', year: null, source: null },
        indigenousGroups: [],
        historicalNotes: [response],
        landmarks: [],
        culturalContext: '',
        economicActivities: [],
        accessibility: 'Unknown',
        additionalInfo: response
      }
    };
  } catch (error) {
    console.error('Error getting village information:', error);
    throw error;
  }
};

module.exports = {
  getSearchRecommendations,
  suggestNameCorrections,
  provideResultContext,
  explainConfidence,
  checkStatus,
  sendChatRequest,
  analyzeBatchResults,
  generateHistoricalInsights,
  predictSearchSuccess,
  suggestSearchStrategy,
  getVillageInformation
};
