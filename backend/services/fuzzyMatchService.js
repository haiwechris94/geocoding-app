const Fuse = require('fuse.js');

/**
 * Fuzzy match service for finding similar village names
 */
class FuzzyMatchService {
  constructor() {
    this.fuseOptions = {
      includeScore: true,
      threshold: 0.4, // Lower = more strict matching
      keys: ['name', 'displayName'],
      minMatchCharLength: 2
    };
  }
  
  /**
   * Find best matches for a village name from a list of candidates
   * @param {string} searchTerm - The village name to search for
   * @param {Array} candidates - Array of candidate objects with name property
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} Matched results with scores
   */
  findMatches(searchTerm, candidates, limit = 5) {
    if (!candidates || candidates.length === 0) {
      return [];
    }
    
    const fuse = new Fuse(candidates, this.fuseOptions);
    const results = fuse.search(searchTerm);
    
    return results.slice(0, limit).map(result => ({
      ...result.item,
      matchScore: 1 - result.score, // Convert to similarity score (higher = better)
      confidence: this.getConfidenceLevel(result.score)
    }));
  }
  
  /**
   * Get confidence level based on fuzzy match score
   * @param {number} score - Fuse.js score (0 = perfect match)
   * @returns {string} Confidence level
   */
  getConfidenceLevel(score) {
    if (score < 0.1) return 'high';
    if (score < 0.25) return 'medium';
    if (score < 0.4) return 'low';
    return 'very_low';
  }
  
  /**
   * Normalize village name for better matching
   * @param {string} name - Village name
   * @returns {string} Normalized name
   */
  normalizeName(name) {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      // Remove common prefixes/suffixes
      .replace(/^(village of |village |town of |town |city of |city )/i, '')
      .replace(/ (village|town|city|hamlet)$/i, '')
      // Normalize accents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove special characters
      .replace(/[^a-z0-9\s-]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const s1 = this.normalizeName(str1);
    const s2 = this.normalizeName(str2);
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const matrix = [];
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    
    return 1 - distance / maxLength;
  }
  
  /**
   * Generate possible variations of a village name
   * @param {string} name - Village name
   * @returns {Array} Array of possible variations
   */
  generateVariations(name) {
    const normalized = this.normalizeName(name);
    const variations = [name, normalized];
    
    // Add variations with common prefixes
    const prefixes = ['village ', 'town ', 'city '];
    prefixes.forEach(prefix => {
      variations.push(prefix + normalized);
    });
    
    // Add variations without hyphens
    if (normalized.includes('-')) {
      variations.push(normalized.replace(/-/g, ' '));
    }
    
    // Add variations with hyphens instead of spaces
    if (normalized.includes(' ')) {
      variations.push(normalized.replace(/ /g, '-'));
    }
    
    return [...new Set(variations)];
  }
}

module.exports = new FuzzyMatchService();
