let Fuse = null;
try { Fuse = require('fuse.js'); } catch (e) {
  console.warn('[FuzzyMatchService] fuse.js not available, falling back to Levenshtein only');
}

// double-metaphone can export as function or as {doubleMetaphone}
let doubleMetaphone = null;
try {
  const dm = require('double-metaphone');
  doubleMetaphone = typeof dm === 'function' ? dm : (dm.doubleMetaphone || dm.default || null);
} catch (e) {
  console.warn('[FuzzyMatchService] double-metaphone not available');
}

/**
 * Fuzzy match service for finding similar village names
 * Combines Fuse.js, Levenshtein distance, and Double Metaphone phonetic matching
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
    if (!candidates || candidates.length === 0) return [];

    // If fuse.js is available, use it
    if (Fuse) {
      const fuse = new Fuse(candidates, this.fuseOptions);
      const results = fuse.search(searchTerm);
      return results.slice(0, limit).map(result => {
        const fuseScore = 1 - result.score;
        const candidateName = result.item.name || result.item.displayName || '';
        const combined = this.combinedSimilarity(searchTerm, candidateName);
        const finalScore = Math.max(fuseScore, combined);
        return { ...result.item, matchScore: finalScore, confidence: this.getConfidenceLevel(1 - finalScore) };
      });
    }

    // Fallback: use only Levenshtein + phonetic similarity
    return candidates
      .map(item => {
        const candidateName = item.name || item.displayName || '';
        const score = this.combinedSimilarity(searchTerm, candidateName);
        return { ...item, matchScore: score, confidence: this.getConfidenceLevel(1 - score) };
      })
      .filter(item => item.matchScore >= 0.3)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
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

  /**
   * Normalize a name using French/African phonetic rules before Double Metaphone
   * Normalise un nom avec des règles phonétiques françaises/africaines
   * @param {string} name - Input name
   * @returns {string} Phonetically normalized name
   */
  normalizePhonetic(name) {
    if (!name) return '';
    let s = name
      .toLowerCase()
      .trim()
      // Remove accents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Double consonants → single
    s = s.replace(/rr/g, 'r');
    s = s.replace(/ll/g, 'l');
    s = s.replace(/nn/g, 'n');

    // Vowel digraph normalizations
    s = s.replace(/iy/g, 'i');
    s = s.replace(/ao/g, 'o');
    s = s.replace(/au/g, 'o');
    s = s.replace(/ou/g, 'u');
    s = s.replace(/oi/g, 'wa');

    // Consonant digraph normalizations
    s = s.replace(/ph/g, 'f');
    s = s.replace(/kh/g, 'k');
    s = s.replace(/gh/g, 'g');
    s = s.replace(/th/g, 't');
    s = s.replace(/ck/g, 'k');
    s = s.replace(/qu/g, 'k');

    // Single character substitutions
    s = s.replace(/x/g, 'ks');
    s = s.replace(/z/g, 's');
    s = s.replace(/w/g, 'v');

    // y → i when between consonants or at end of word
    s = s.replace(/(?<=[^aeiou\s])y(?=[^aeiou\s])/g, 'i'); // between consonants
    s = s.replace(/y$/g, 'i');                               // at end of word

    // Remove silent final 'e' and 's'
    s = s.replace(/e$/g, '');
    s = s.replace(/s$/g, '');

    return s;
  }

  /**
   * Compute Double Metaphone phonetic codes for a name
   * Applies French/African phonetic normalization before Double Metaphone
   * @param {string} name - Input name
   * @returns {Array<string>} [primaryCode, secondaryCode]
   */
  phoneticCode(name) {
    if (!name || !doubleMetaphone) return ['', ''];
    const normalized = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    try {
      const codes = doubleMetaphone(normalized);
      return [codes[0] || '', codes[1] || ''];
    } catch (e) {
      return ['', ''];
    }
  }

  /**
   * Calculate phonetic similarity between two names using Double Metaphone
   * Also compares normalized phonetic forms directly for African/French names
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} Phonetic similarity score (0-1)
   */
  phoneticSimilarity(name1, name2) {
    const [primary1, secondary1] = this.phoneticCode(name1);
    const [primary2, secondary2] = this.phoneticCode(name2);

    // Exact primary match
    if (primary1 && primary2 && primary1 === primary2) return 1.0;

    // Cross primary/secondary match
    if (
      (primary1 && secondary2 && primary1 === secondary2) ||
      (primary2 && secondary1 && primary2 === secondary1)
    ) return 0.8;

    // Secondary match
    if (secondary1 && secondary2 && secondary1 === secondary2) return 0.6;

    // Normalized phonetic form exact match (French/African names)
    const norm1 = this.normalizePhonetic(name1);
    const norm2 = this.normalizePhonetic(name2);
    if (norm1 && norm2 && norm1 === norm2) return 1.0;

    // Partial similarity based on common characters between codes
    const code1 = primary1 || secondary1 || '';
    const code2 = primary2 || secondary2 || '';
    if (!code1 || !code2) return 0;

    const maxLen = Math.max(code1.length, code2.length);
    if (maxLen === 0) return 0;

    let commonChars = 0;
    const shorter = code1.length <= code2.length ? code1 : code2;
    const longer  = code1.length <= code2.length ? code2 : code1;
    const usedIndices = new Set();

    for (const ch of shorter) {
      const idx = longer.split('').findIndex((c, i) => c === ch && !usedIndices.has(i));
      if (idx !== -1) {
        commonChars++;
        usedIndices.add(idx);
      }
    }

    return commonChars / maxLen;
  }

  /**
   * Calculate combined similarity: 40% Levenshtein + 60% phonetic
   * FIX 5 — Poids phonétique augmenté de 50% à 60% pour mieux gérer les noms
   * africains et français où la phonétique est plus fiable que l'orthographe.
   * Exemple : "Riyao" et "Riao" → score phonétique élevé même si Levenshtein partiel.
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} Combined similarity score (0-1)
   */
  combinedSimilarity(name1, name2) {
    const levenshteinScore = this.calculateSimilarity(name1, name2);
    const phoneticScore = this.phoneticSimilarity(name1, name2);
    return (levenshteinScore * 0.40) + (phoneticScore * 0.60);
  }
}

module.exports = new FuzzyMatchService();