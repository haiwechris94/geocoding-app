/**
 * Search History Service
 * Service d'Historique de Recherche
 * 
 * Tracks and analyzes search history for insights.
 * Suit et analyse l'historique de recherche pour des insights.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const deepseekService = require('./deepseekService');

// Storage file path
const HISTORY_FILE = path.join(__dirname, '../data/searchHistory.json');
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load search history from file
 * Charger l'historique de recherche depuis le fichier
 * 
 * @returns {Array} Search history entries
 */
const loadHistory = () => {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading search history:', error);
  }
  return [];
};

/**
 * Save search history to file
 * Sauvegarder l'historique de recherche dans le fichier
 * 
 * @param {Array} history - Search history entries
 */
const saveHistory = (history) => {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving search history:', error);
  }
};

/**
 * Add a search entry to history
 * Ajouter une entrée de recherche à l'historique
 * 
 * @param {Object} searchData - Search data to store
 * @returns {Object} Created history entry
 */
const addSearchEntry = (searchData) => {
  const history = loadHistory();
  
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    query: searchData.query || searchData.villageName,
    type: searchData.type || 'single', // single, batch, area
    filters: searchData.filters || {},
    result: {
      found: searchData.found || false,
      confidence: searchData.confidence || 0,
      latitude: searchData.latitude || null,
      longitude: searchData.longitude || null,
      source: searchData.source || null,
      formattedAddress: searchData.formattedAddress || null
    },
    metadata: {
      responseTime: searchData.responseTime || null,
      alternativesCount: searchData.alternativesCount || 0,
      userAgent: searchData.userAgent || null
    }
  };
  
  history.unshift(entry); // Add to beginning
  
  // Keep only last 1000 entries
  if (history.length > 1000) {
    history.splice(1000);
  }
  
  saveHistory(history);
  return entry;
};

/**
 * Get search history with optional filters
 * Obtenir l'historique de recherche avec des filtres optionnels
 * 
 * @param {Object} options - Filter options
 * @returns {Object} Filtered history with pagination
 */
const getSearchHistory = (options = {}) => {
  const {
    page = 1,
    limit = 50,
    startDate = null,
    endDate = null,
    query = null,
    type = null,
    found = null,
    countryCode = null
  } = options;
  
  let history = loadHistory();
  
  // Apply filters
  if (startDate) {
    history = history.filter(h => new Date(h.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    history = history.filter(h => new Date(h.timestamp) <= new Date(endDate));
  }
  
  if (query) {
    const queryLower = query.toLowerCase();
    history = history.filter(h => 
      h.query && h.query.toLowerCase().includes(queryLower)
    );
  }
  
  if (type) {
    history = history.filter(h => h.type === type);
  }
  
  if (found !== null) {
    history = history.filter(h => h.result.found === found);
  }
  
  if (countryCode) {
    history = history.filter(h => 
      h.filters && h.filters.countryCode === countryCode
    );
  }
  
  // Pagination
  const total = history.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedHistory = history.slice(offset, offset + limit);
  
  return {
    data: paginatedHistory,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

/**
 * Get search history statistics
 * Obtenir les statistiques de l'historique de recherche
 * 
 * @returns {Object} Statistics
 */
const getSearchStatistics = () => {
  const history = loadHistory();
  
  if (history.length === 0) {
    return {
      totalSearches: 0,
      successRate: 0,
      averageConfidence: 0,
      mostSearchedLocations: [],
      searchesByType: {},
      searchesByCountry: {},
      searchesByDay: [],
      recentTrends: []
    };
  }
  
  // Basic stats
  const totalSearches = history.length;
  const successfulSearches = history.filter(h => h.result.found).length;
  const successRate = Math.round((successfulSearches / totalSearches) * 100);
  
  // Average confidence
  const confidences = history
    .filter(h => h.result.found && h.result.confidence)
    .map(h => h.result.confidence);
  const averageConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
    : 0;
  
  // Most searched locations
  const locationCounts = {};
  for (const entry of history) {
    if (entry.query) {
      const key = entry.query.toLowerCase();
      locationCounts[key] = (locationCounts[key] || 0) + 1;
    }
  }
  
  const mostSearchedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Searches by type
  const searchesByType = {};
  for (const entry of history) {
    searchesByType[entry.type] = (searchesByType[entry.type] || 0) + 1;
  }
  
  // Searches by country
  const searchesByCountry = {};
  for (const entry of history) {
    const country = entry.filters?.countryCode || 'unknown';
    searchesByCountry[country] = (searchesByCountry[country] || 0) + 1;
  }
  
  // Searches by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const searchesByDay = [];
  const dayMap = {};
  
  for (const entry of history) {
    const entryDate = new Date(entry.timestamp);
    if (entryDate >= thirtyDaysAgo) {
      const dayKey = entryDate.toISOString().split('T')[0];
      dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
    }
  }
  
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayKey = date.toISOString().split('T')[0];
    searchesByDay.unshift({
      date: dayKey,
      count: dayMap[dayKey] || 0
    });
  }
  
  // Recent trends (last 7 days vs previous 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  const recentSearches = history.filter(h => new Date(h.timestamp) >= sevenDaysAgo);
  const previousSearches = history.filter(h => {
    const date = new Date(h.timestamp);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  });
  
  const recentTrends = {
    searchVolume: {
      current: recentSearches.length,
      previous: previousSearches.length,
      change: previousSearches.length > 0
        ? Math.round(((recentSearches.length - previousSearches.length) / previousSearches.length) * 100)
        : 0
    },
    successRate: {
      current: recentSearches.length > 0
        ? Math.round((recentSearches.filter(h => h.result.found).length / recentSearches.length) * 100)
        : 0,
      previous: previousSearches.length > 0
        ? Math.round((previousSearches.filter(h => h.result.found).length / previousSearches.length) * 100)
        : 0
    }
  };
  
  return {
    totalSearches,
    successRate,
    averageConfidence,
    mostSearchedLocations,
    searchesByType,
    searchesByCountry,
    searchesByDay,
    recentTrends
  };
};

/**
 * Analyze search patterns with AI
 * Analyser les patterns de recherche avec l'IA
 * 
 * @param {string} language - Response language
 * @returns {Promise<Object>} AI analysis
 */
const analyzeSearchPatterns = async (language = 'en') => {
  const history = loadHistory();
  const stats = getSearchStatistics();
  
  if (history.length < 5) {
    return {
      insights: [],
      recommendations: [],
      message: {
        en: 'Not enough search history for analysis. Perform more searches.',
        fr: 'Pas assez d\'historique de recherche pour l\'analyse. Effectuez plus de recherches.'
      }
    };
  }
  
  try {
    const analysis = await deepseekService.generateHistoricalInsights(
      history.slice(0, 100), // Last 100 searches
      stats,
      language
    );
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing search patterns:', error);
    
    // Return basic analysis if AI fails
    return generateBasicAnalysis(stats, language);
  }
};

/**
 * Generate basic analysis without AI
 * Générer une analyse basique sans IA
 * 
 * @param {Object} stats - Statistics
 * @param {string} language - Response language
 * @returns {Object} Basic analysis
 */
const generateBasicAnalysis = (stats, language = 'en') => {
  const insights = [];
  const recommendations = [];
  
  // Success rate insight
  if (stats.successRate < 50) {
    insights.push({
      type: 'warning',
      message: language === 'fr'
        ? `Taux de réussite faible (${stats.successRate}%). Vérifiez l'orthographe des noms de villages.`
        : `Low success rate (${stats.successRate}%). Check village name spelling.`
    });
    recommendations.push({
      message: language === 'fr'
        ? 'Utilisez les filtres géographiques pour améliorer la précision.'
        : 'Use geographic filters to improve accuracy.'
    });
  } else if (stats.successRate >= 80) {
    insights.push({
      type: 'success',
      message: language === 'fr'
        ? `Excellent taux de réussite (${stats.successRate}%)!`
        : `Excellent success rate (${stats.successRate}%)!`
    });
  }
  
  // Most searched locations
  if (stats.mostSearchedLocations.length > 0) {
    const topLocation = stats.mostSearchedLocations[0];
    insights.push({
      type: 'info',
      message: language === 'fr'
        ? `"${topLocation.name}" est votre recherche la plus fréquente (${topLocation.count} fois).`
        : `"${topLocation.name}" is your most frequent search (${topLocation.count} times).`
    });
  }
  
  // Trend analysis
  if (stats.recentTrends && stats.recentTrends.searchVolume) {
    const change = stats.recentTrends.searchVolume.change;
    if (change > 20) {
      insights.push({
        type: 'info',
        message: language === 'fr'
          ? `Volume de recherche en hausse de ${change}% cette semaine.`
          : `Search volume up ${change}% this week.`
      });
    } else if (change < -20) {
      insights.push({
        type: 'info',
        message: language === 'fr'
          ? `Volume de recherche en baisse de ${Math.abs(change)}% cette semaine.`
          : `Search volume down ${Math.abs(change)}% this week.`
      });
    }
  }
  
  return { insights, recommendations };
};

/**
 * Delete a history entry
 * Supprimer une entrée de l'historique
 * 
 * @param {string} entryId - Entry ID to delete
 * @returns {boolean} Success status
 */
const deleteHistoryEntry = (entryId) => {
  const history = loadHistory();
  const index = history.findIndex(h => h.id === entryId);
  
  if (index === -1) {
    return false;
  }
  
  history.splice(index, 1);
  saveHistory(history);
  return true;
};

/**
 * Clear all search history
 * Effacer tout l'historique de recherche
 * 
 * @returns {boolean} Success status
 */
const clearAllHistory = () => {
  try {
    saveHistory([]);
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
};

/**
 * Export search history
 * Exporter l'historique de recherche
 * 
 * @param {string} format - Export format (json, csv)
 * @returns {Object} Export data
 */
const exportHistory = (format = 'json') => {
  const history = loadHistory();
  
  if (format === 'csv') {
    const headers = ['ID', 'Timestamp', 'Query', 'Type', 'Found', 'Confidence', 'Latitude', 'Longitude', 'Source'];
    const rows = history.map(h => [
      h.id,
      h.timestamp,
      h.query,
      h.type,
      h.result.found,
      h.result.confidence,
      h.result.latitude,
      h.result.longitude,
      h.result.source
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return { format: 'csv', data: csv, filename: `search_history_${Date.now()}.csv` };
  }
  
  return { format: 'json', data: history, filename: `search_history_${Date.now()}.json` };
};

module.exports = {
  addSearchEntry,
  getSearchHistory,
  getSearchStatistics,
  analyzeSearchPatterns,
  deleteHistoryEntry,
  clearAllHistory,
  exportHistory
};
