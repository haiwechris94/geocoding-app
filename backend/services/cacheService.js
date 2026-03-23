/**
 * Cache Service
 * Service de Cache
 * 
 * Redis-like in-memory caching with:
 * - TTL (time-to-live) management
 * - Cache invalidation strategies
 * - Geocoding results caching
 * - AI response caching
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Default TTL values (in milliseconds)
    this.defaultTTL = {
      geocoding: 24 * 60 * 60 * 1000, // 24 hours
      ai: 60 * 60 * 1000, // 1 hour
      filters: 12 * 60 * 60 * 1000, // 12 hours
      default: 30 * 60 * 1000 // 30 minutes
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate cache key
   * @param {string} prefix - Key prefix (e.g., 'geocoding', 'ai')
   * @param {object|string} params - Parameters to hash
   * @returns {string} Cache key
   */
  generateKey(prefix, params) {
    const paramString = typeof params === 'string' 
      ? params 
      : JSON.stringify(params, Object.keys(params).sort());
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `${prefix}:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = null) {
    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      expiresAt: ttl ? Date.now() + ttl : null
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Clear cache entries by prefix
   * @param {string} prefix - Key prefix to clear
   */
  clearByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`Cleared ${count} cache entries with prefix: ${prefix}`);
    return count;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2) 
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   * @returns {string} Estimated memory usage
   */
  estimateMemoryUsage() {
    let bytes = 0;
    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 64; // Overhead for metadata
    }
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // ==========================================
  // Specialized Caching Methods
  // ==========================================

  /**
   * Cache geocoding result
   * @param {string} query - Search query
   * @param {object} filters - Search filters
   * @param {object} result - Geocoding result
   */
  cacheGeocodingResult(query, filters, result) {
    const key = this.generateKey('geocoding', { query, filters });
    this.set(key, result, this.defaultTTL.geocoding);
  }

  /**
   * Get cached geocoding result
   * @param {string} query - Search query
   * @param {object} filters - Search filters
   * @returns {object|null} Cached result or null
   */
  getCachedGeocodingResult(query, filters) {
    const key = this.generateKey('geocoding', { query, filters });
    return this.get(key);
  }

  /**
   * Cache AI response
   * @param {string} type - AI request type
   * @param {object} params - Request parameters
   * @param {object} response - AI response
   */
  cacheAIResponse(type, params, response) {
    const key = this.generateKey(`ai:${type}`, params);
    this.set(key, response, this.defaultTTL.ai);
  }

  /**
   * Get cached AI response
   * @param {string} type - AI request type
   * @param {object} params - Request parameters
   * @returns {object|null} Cached response or null
   */
  getCachedAIResponse(type, params) {
    const key = this.generateKey(`ai:${type}`, params);
    return this.get(key);
  }

  /**
   * Cache filter options (countries, regions, etc.)
   * @param {string} filterType - Filter type
   * @param {string} parentId - Parent filter ID (optional)
   * @param {array} options - Filter options
   */
  cacheFilterOptions(filterType, parentId, options) {
    const key = this.generateKey('filters', { filterType, parentId });
    this.set(key, options, this.defaultTTL.filters);
  }

  /**
   * Get cached filter options
   * @param {string} filterType - Filter type
   * @param {string} parentId - Parent filter ID (optional)
   * @returns {array|null} Cached options or null
   */
  getCachedFilterOptions(filterType, parentId) {
    const key = this.generateKey('filters', { filterType, parentId });
    return this.get(key);
  }

  /**
   * Invalidate geocoding cache for a specific query
   * @param {string} query - Search query
   */
  invalidateGeocodingCache(query) {
    const prefix = this.generateKey('geocoding', { query }).split(':')[0];
    this.clearByPrefix(prefix);
  }

  /**
   * Invalidate all AI cache
   */
  invalidateAICache() {
    this.clearByPrefix('ai:');
  }

  /**
   * Get or set pattern (cache-aside)
   * @param {string} key - Cache key
   * @param {function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} Cached or fetched value
   */
  async getOrSet(key, fetchFn, ttl = null) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl || this.defaultTTL.default);
    return value;
  }

  /**
   * Destroy cache service
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
