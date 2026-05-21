/**
 * HERE Geocoding & Search API Service
 * Service de Géocodage HERE
 *
 * Integration with HERE Geocoding & Search API v1 for village geocoding.
 * Intégration avec l'API HERE Geocoding & Search v1 pour le géocodage des villages.
 *
 * Free tier (Base Plan): 250,000 transactions/month
 * Docs: https://developer.here.com/documentation/geocoding-search-api/dev_guide/index.html
 */

const axios = require('axios');

class HereService {
  constructor() {
    this.apiKey    = process.env.HERE_API_KEY;
    this.baseUrl   = 'https://geocode.search.hereapi.com/v1/geocode';
    this.rateLimit = 250000; // Free tier: 250 000 requests/month
    this.reliability = 0.87;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Geocode a village name to coordinates.
   * Géocoder un nom de village en coordonnées.
   *
   * @param {string} villageName  - Name of the village / Nom du village
   * @param {Object} filters      - Geographic filters (country, countryCode, …)
   * @param {string} [lang='en']  - Language code for results
   * @returns {Promise<Array>}    Array of formatted geocoding results
   */
  async geocode(villageName, filters = {}, lang = 'en') {
    if (!this.apiKey) {
      console.warn('[HERE] API key not configured (HERE_API_KEY)');
      return [];
    }

    try {
      const params = {
        q:      villageName,
        apiKey: this.apiKey,
        lang,
        limit:  10,
        show:   'countryInfo'
      };

      // HERE uses ISO-3166-1 alpha-3 country codes in the `in` parameter.
      // e.g. in=countryCode:NGA  or  in=countryCode:TCD
      const cc3 = this._resolveCountryCode3(filters);
      if (cc3) {
        params.in = `countryCode:${cc3}`;
      }

      const response = await axios.get(this.baseUrl, {
        params,
        timeout: 8000
      });

      const items = response.data?.items;
      if (!Array.isArray(items) || items.length === 0) return [];

      return this._formatResults(items, villageName);
    } catch (error) {
      console.error('[HERE] Geocoding error:', error.message);
      return [];
    }
  }

  /**
   * Check API key validity and quota.
   * Vérifier la validité de la clé API et le quota.
   *
   * @returns {Promise<Object>} Status object
   */
  async checkStatus() {
    if (!this.apiKey) {
      return {
        available: false,
        message: {
          en: 'API key not configured (HERE_API_KEY)',
          fr: 'Clé API non configurée (HERE_API_KEY)'
        }
      };
    }

    try {
      await axios.get(this.baseUrl, {
        params: { q: 'test', apiKey: this.apiKey, limit: 1 },
        timeout: 5000
      });
      return { available: true };
    } catch (error) {
      // 401 = invalid key, 429 = quota exceeded
      const status = error.response?.status;
      return {
        available: false,
        message: {
          en: status === 401 ? 'Invalid API key' : error.message,
          fr: status === 401 ? 'Clé API invalide'  : error.message
        }
      };
    }
  }

  /**
   * Whether the service is enabled (key present).
   * @returns {boolean}
   */
  isEnabled() {
    return !!this.apiKey;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Format HERE API items into the app's standard result shape.
   * @param {Array}  items         - Raw HERE result items
   * @param {string} originalQuery - Original search query
   * @returns {Array}
   */
  _formatResults(items, originalQuery) {
    return items.map(item => {
      const pos     = item.position || {};
      const address = item.address  || {};

      // Best available place name
      const name =
        address.village  ||
        address.district ||
        address.city     ||
        address.county   ||
        item.title       ||
        originalQuery;

      return {
        source:           'HERE',
        sourceFR:         'HERE',
        latitude:         pos.lat,
        longitude:        pos.lng,
        formattedAddress: item.title || address.label || '',
        name,
        country:          address.countryName || '',
        countryCode:      address.countryCode || '',   // ISO-3166-1 alpha-3
        region:           address.state       || '',
        department:       address.county      || '',
        confidence:       this._scoreConfidence(item),
        reliability:      this.reliability,
        matchQuality:     this._calculateMatchQuality(originalQuery, item),
        raw:              item
      };
    });
  }

  /**
   * Derive a 0-1 confidence score from HERE's resultType and scoring fields.
   * @param {Object} item - HERE result item
   * @returns {number}
   */
  _scoreConfidence(item) {
    // HERE provides a `scoring` object with queryScore and fieldScore
    const qs = item.scoring?.queryScore ?? null;
    if (qs !== null) return parseFloat(qs.toFixed(2));

    // Fallback: map resultType to a rough confidence
    const typeMap = {
      houseNumber:  0.95,
      street:       0.80,
      locality:     0.85,
      administrativeArea: 0.70,
      place:        0.75
    };
    return typeMap[item.resultType] ?? 0.70;
  }

  /**
   * Calculate match quality between the query and the returned name.
   * @param {string} query - Original query
   * @param {Object} item  - HERE result item
   * @returns {number}
   */
  _calculateMatchQuality(query, item) {
    const confidence = this._scoreConfidence(item);
    const name       = (item.address?.village || item.address?.city || item.title || '').toLowerCase();
    const similarity = this._stringSimilarity(query.toLowerCase(), name);
    return parseFloat((confidence * 0.6 + similarity * 0.4).toFixed(2));
  }

  /**
   * Resolve the best ISO-3166-1 alpha-3 country code from filters.
   * HERE requires alpha-3; we accept alpha-2 or full names and convert.
   * @param {Object} filters
   * @returns {string|null}
   */
  _resolveCountryCode3(filters) {
    const raw = filters.countryCode || filters.country || '';
    if (!raw) return null;

    // Already alpha-3?
    if (/^[A-Za-z]{3}$/.test(raw)) return raw.toUpperCase();

    // Alpha-2 → alpha-3 map (Africa-focused, matches opencageService country list)
    const alpha2to3 = {
      TD: 'TCD', CG: 'COG', CD: 'COD', CM: 'CMR', CF: 'CAF', GA: 'GAB', GQ: 'GNQ',
      NG: 'NGA', NE: 'NER', ML: 'MLI', BF: 'BFA', SN: 'SEN', GN: 'GIN', CI: 'CIV',
      GH: 'GHA', TG: 'TGO', BJ: 'BEN', MR: 'MRT', LR: 'LBR', SL: 'SLE', GW: 'GNB',
      GM: 'GMB', CV: 'CPV', SD: 'SDN', SS: 'SSD', ET: 'ETH', KE: 'KEN', UG: 'UGA',
      TZ: 'TZA', RW: 'RWA', BI: 'BDI', SO: 'SOM', ER: 'ERI', DJ: 'DJI', ZA: 'ZAF',
      MZ: 'MOZ', ZW: 'ZWE', ZM: 'ZMB', MW: 'MWI', AO: 'AGO', NA: 'NAM', BW: 'BWA',
      MG: 'MDG', EG: 'EGY', LY: 'LBY', TN: 'TUN', DZ: 'DZA', MA: 'MAR'
    };

    const upper = raw.toUpperCase();
    if (alpha2to3[upper]) return alpha2to3[upper];

    // Full country name → alpha-3 (same Africa list)
    const nameToAlpha3 = {
      'Chad': 'TCD', 'Tchad': 'TCD',
      'Congo': 'COG', 'Congo Brazzaville': 'COG', 'Republic of the Congo': 'COG',
      'Democratic Republic of the Congo': 'COD', 'DRC': 'COD', 'RDC': 'COD', 'Congo Kinshasa': 'COD',
      'Cameroon': 'CMR', 'Cameroun': 'CMR',
      'Central African Republic': 'CAF', 'République Centrafricaine': 'CAF', 'CAR': 'CAF', 'RCA': 'CAF',
      'Gabon': 'GAB', 'Equatorial Guinea': 'GNQ', 'Guinée Équatoriale': 'GNQ',
      'Nigeria': 'NGA', 'Nigéria': 'NGA', 'Niger': 'NER', 'Mali': 'MLI',
      'Burkina Faso': 'BFA', 'Senegal': 'SEN', 'Sénégal': 'SEN',
      'Guinea': 'GIN', 'Guinée': 'GIN', "Ivory Coast": 'CIV', "Côte d'Ivoire": 'CIV',
      'Ghana': 'GHA', 'Togo': 'TGO', 'Benin': 'BEN', 'Bénin': 'BEN',
      'Mauritania': 'MRT', 'Mauritanie': 'MRT', 'Liberia': 'LBR', 'Libéria': 'LBR',
      'Sierra Leone': 'SLE', 'Guinea-Bissau': 'GNB', 'Guinée-Bissau': 'GNB',
      'Gambia': 'GMB', 'Gambie': 'GMB', 'Cape Verde': 'CPV', 'Cap-Vert': 'CPV',
      'Sudan': 'SDN', 'Soudan': 'SDN', 'South Sudan': 'SSD', 'Soudan du Sud': 'SSD',
      'Ethiopia': 'ETH', 'Éthiopie': 'ETH', 'Kenya': 'KEN', 'Uganda': 'UGA', 'Ouganda': 'UGA',
      'Tanzania': 'TZA', 'Tanzanie': 'TZA', 'Rwanda': 'RWA', 'Burundi': 'BDI',
      'Somalia': 'SOM', 'Somalie': 'SOM', 'Eritrea': 'ERI', 'Érythrée': 'ERI', 'Djibouti': 'DJI',
      'South Africa': 'ZAF', 'Afrique du Sud': 'ZAF', 'Mozambique': 'MOZ',
      'Zimbabwe': 'ZWE', 'Zambia': 'ZMB', 'Zambie': 'ZMB', 'Malawi': 'MWI',
      'Angola': 'AGO', 'Namibia': 'NAM', 'Namibie': 'NAM', 'Botswana': 'BWA',
      'Madagascar': 'MDG', 'Egypt': 'EGY', 'Égypte': 'EGY', 'Libya': 'LBY', 'Libye': 'LBY',
      'Tunisia': 'TUN', 'Tunisie': 'TUN', 'Algeria': 'DZA', 'Algérie': 'DZA',
      'Morocco': 'MAR', 'Maroc': 'MAR'
    };

    return nameToAlpha3[raw] || null;
  }

  /** Simple Levenshtein-based string similarity (0-1). */
  _stringSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b)  return 1;
    const longer  = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    const dist    = this._levenshtein(longer, shorter);
    return (longer.length - dist) / longer.length;
  }

  _levenshtein(s, t) {
    const m = s.length, n = t.length;
    const dp = Array.from({ length: n + 1 }, (_, i) => i);
    for (let j = 1; j <= m; j++) {
      let prev = dp[0];
      dp[0] = j;
      for (let i = 1; i <= n; i++) {
        const temp = dp[i];
        dp[i] = s[j - 1] === t[i - 1]
          ? prev
          : 1 + Math.min(prev, dp[i], dp[i - 1]);
        prev = temp;
      }
    }
    return dp[n];
  }
}

// Export singleton instance
module.exports = new HereService();
