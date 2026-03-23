/**
 * OpenCage Geocoding Service
 * Service de Géocodage OpenCage
 * 
 * Integration with OpenCage Geocoder API for village geocoding.
 * Intégration avec l'API OpenCage Geocoder pour le géocodage des villages.
 */

const axios = require('axios');

class OpenCageService {
  constructor() {
    this.apiKey = process.env.OPENCAGE_API_KEY;
    this.baseUrl = 'https://api.opencagedata.com/geocode/v1/json';
    this.rateLimit = 2500; // Free tier: 2500 requests/day
    this.reliability = 0.82; // Reliability score for confidence calculation
  }

  /**
   * Geocode a village name to coordinates
   * Géocoder un nom de village en coordonnées
   * 
   * @param {string} villageName - Name of the village
   * @param {Object} filters - Geographic filters (country, region, etc.)
   * @param {string} language - Language code (en/fr)
   * @returns {Promise<Array>} Array of geocoding results
   */
  async geocode(villageName, filters = {}, language = 'en') {
    if (!this.apiKey) {
      console.warn('OpenCage API key not configured');
      return [];
    }

    try {
      const params = {
        q: villageName,
        key: this.apiKey,
        language: language,
        limit: 10,
        no_annotations: 0, // Include all data
        pretty: 0
      };

      // Add country filter if provided
      if (filters.countryCode) {
        params.countrycode = filters.countryCode.toLowerCase();
      } else if (filters.country) {
        params.countrycode = this.getCountryCode(filters.country);
      }

      // Add bounds filter if region/department provided
      if (filters.bounds) {
        // Format: minLng,minLat,maxLng,maxLat
        params.bounds = `${filters.bounds.west},${filters.bounds.south},${filters.bounds.east},${filters.bounds.north}`;
      }

      const response = await axios.get(this.baseUrl, { 
        params,
        timeout: 10000
      });

      if (response.data.status.code === 200) {
        return this.formatResults(response.data.results, villageName);
      } else {
        console.error('OpenCage API error:', response.data.status.message);
        return [];
      }
    } catch (error) {
      console.error('OpenCage geocoding error:', error.message);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address
   * Géocodage inverse des coordonnées vers une adresse
   * 
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} language
   * @returns {Promise<Object>}
   */
  async reverseGeocode(latitude, longitude, language = 'en') {
    if (!this.apiKey) {
      console.warn('OpenCage API key not configured');
      return null;
    }

    try {
      const params = {
        q: `${latitude},${longitude}`,
        key: this.apiKey,
        language: language,
        no_annotations: 0
      };

      const response = await axios.get(this.baseUrl, { 
        params,
        timeout: 10000
      });

      if (response.data.status.code === 200 && response.data.results.length > 0) {
        return this.formatReverseResult(response.data.results[0]);
      }
      return null;
    } catch (error) {
      console.error('OpenCage reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Format OpenCage results to match app format
   * Formater les résultats OpenCage pour correspondre au format de l'application
   * 
   * @param {Array} results - Raw OpenCage results
   * @param {string} originalQuery - Original search query
   * @returns {Array} Formatted results
   */
  formatResults(results, originalQuery) {
    return results.map(result => {
      const name = result.components.village || 
                   result.components.town || 
                   result.components.city ||
                   result.components.hamlet ||
                   result.components.locality ||
                   result.formatted.split(',')[0];

      return {
        source: 'OpenCage',
        sourceFR: 'OpenCage',
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        formattedAddress: result.formatted,
        confidence: result.confidence / 10, // Convert 0-10 to 0-1
        reliability: this.reliability,
        name: name,
        country: result.components.country,
        countryCode: result.components.country_code?.toUpperCase(),
        region: result.components.state || result.components.region,
        department: result.components.county || result.components.state_district,
        bounds: result.bounds,
        matchQuality: this.calculateMatchQuality(originalQuery, result),
        components: result.components,
        raw: result
      };
    });
  }

  /**
   * Format reverse geocoding result
   * Formater le résultat de géocodage inverse
   * 
   * @param {Object} result - Raw OpenCage result
   * @returns {Object} Formatted result
   */
  formatReverseResult(result) {
    return {
      source: 'OpenCage',
      sourceFR: 'OpenCage',
      formattedAddress: result.formatted,
      components: result.components,
      latitude: result.geometry.lat,
      longitude: result.geometry.lng,
      confidence: result.confidence / 10,
      country: result.components.country,
      region: result.components.state || result.components.region,
      raw: result
    };
  }

  /**
   * Calculate match quality based on confidence and name similarity
   * Calculer la qualité de correspondance basée sur la confiance et la similarité du nom
   * 
   * @param {string} query - Original search query
   * @param {Object} result - OpenCage result
   * @returns {number} Match quality score (0-1)
   */
  calculateMatchQuality(query, result) {
    const confidence = result.confidence / 10;
    const name = result.components.village || 
                 result.components.town || 
                 result.components.city ||
                 result.components.hamlet ||
                 '';
    
    // Simple string similarity
    const similarity = this.stringSimilarity(query.toLowerCase(), name.toLowerCase());
    
    return parseFloat((confidence * 0.6 + similarity * 0.4).toFixed(2));
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Calculer la similarité de chaîne en utilisant la distance de Levenshtein
   * 
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  stringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Calculer la distance de Levenshtein entre deux chaînes
   * 
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get ISO country code from country name
   * Obtenir le code pays ISO à partir du nom du pays
   * 
   * @param {string} countryName - Country name
   * @returns {string} ISO country code
   */
  getCountryCode(countryName) {
    const countryCodes = {
      // Central Africa / Afrique Centrale
      'Chad': 'td', 'Tchad': 'td',
      'Congo': 'cg', 'Congo Brazzaville': 'cg', 'Republic of the Congo': 'cg',
      'Democratic Republic of the Congo': 'cd', 'DRC': 'cd', 'RDC': 'cd', 'Congo Kinshasa': 'cd',
      'Cameroon': 'cm', 'Cameroun': 'cm',
      'Central African Republic': 'cf', 'République Centrafricaine': 'cf', 'CAR': 'cf', 'RCA': 'cf',
      'Gabon': 'ga',
      'Equatorial Guinea': 'gq', 'Guinée Équatoriale': 'gq',
      
      // West Africa / Afrique de l'Ouest
      'Nigeria': 'ng', 'Nigéria': 'ng',
      'Niger': 'ne',
      'Mali': 'ml',
      'Burkina Faso': 'bf',
      'Senegal': 'sn', 'Sénégal': 'sn',
      'Guinea': 'gn', 'Guinée': 'gn',
      'Ivory Coast': 'ci', 'Côte d\'Ivoire': 'ci',
      'Ghana': 'gh',
      'Togo': 'tg',
      'Benin': 'bj', 'Bénin': 'bj',
      'Mauritania': 'mr', 'Mauritanie': 'mr',
      'Liberia': 'lr', 'Libéria': 'lr',
      'Sierra Leone': 'sl',
      'Guinea-Bissau': 'gw', 'Guinée-Bissau': 'gw',
      'Gambia': 'gm', 'Gambie': 'gm',
      'Cape Verde': 'cv', 'Cap-Vert': 'cv',
      
      // East Africa / Afrique de l'Est
      'Sudan': 'sd', 'Soudan': 'sd',
      'South Sudan': 'ss', 'Soudan du Sud': 'ss',
      'Ethiopia': 'et', 'Éthiopie': 'et',
      'Kenya': 'ke',
      'Uganda': 'ug', 'Ouganda': 'ug',
      'Tanzania': 'tz', 'Tanzanie': 'tz',
      'Rwanda': 'rw',
      'Burundi': 'bi',
      'Somalia': 'so', 'Somalie': 'so',
      'Eritrea': 'er', 'Érythrée': 'er',
      'Djibouti': 'dj',
      
      // Southern Africa / Afrique Australe
      'South Africa': 'za', 'Afrique du Sud': 'za',
      'Mozambique': 'mz',
      'Zimbabwe': 'zw',
      'Zambia': 'zm', 'Zambie': 'zm',
      'Malawi': 'mw',
      'Angola': 'ao',
      'Namibia': 'na', 'Namibie': 'na',
      'Botswana': 'bw',
      'Madagascar': 'mg',
      
      // North Africa / Afrique du Nord
      'Egypt': 'eg', 'Égypte': 'eg',
      'Libya': 'ly', 'Libye': 'ly',
      'Tunisia': 'tn', 'Tunisie': 'tn',
      'Algeria': 'dz', 'Algérie': 'dz',
      'Morocco': 'ma', 'Maroc': 'ma'
    };
    
    return countryCodes[countryName] || '';
  }

  /**
   * Check API status and remaining quota
   * Vérifier le statut de l'API et le quota restant
   * 
   * @returns {Promise<Object>} API status information
   */
  async checkStatus() {
    if (!this.apiKey) {
      return { 
        available: false, 
        message: {
          en: 'API key not configured',
          fr: 'Clé API non configurée'
        }
      };
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: 'test',
          key: this.apiKey,
          limit: 1
        },
        timeout: 5000
      });

      return {
        available: true,
        remaining: response.data.rate?.remaining || 'unknown',
        limit: response.data.rate?.limit || this.rateLimit,
        reset: response.data.rate?.reset || null
      };
    } catch (error) {
      return {
        available: false,
        message: {
          en: error.message,
          fr: error.message
        }
      };
    }
  }

  /**
   * Check if the service is enabled
   * Vérifier si le service est activé
   * 
   * @returns {boolean} Whether the service is enabled
   */
  isEnabled() {
    return !!this.apiKey;
  }
}

// Export singleton instance
module.exports = new OpenCageService();
