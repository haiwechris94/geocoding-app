/**
 * Geocoding Service
 * Service de Géocodage
 * 
 * Core geocoding logic with multi-API aggregation, confidence scoring,
 * and fuzzy matching for village names.
 * 
 * Logique de géocodage principale avec agrégation multi-API, score de confiance,
 * et correspondance floue pour les noms de villages.
 */

const levenshtein = require('fast-levenshtein');
const fuzzyMatchService = require('./fuzzyMatchService');
const { geocodeWithAllAPIs, reverseGeocode } = require('./apiClients');
const { confidenceWeights, geocodingSettings } = require('../config/apiConfig');
const { getCountryByCode } = require('../config/countries');
const { calculateBorderProximity } = require('./proximityService');

/**
 * Calculate Levenshtein similarity between two strings
 * Calculer la similarité de Levenshtein entre deux chaînes
 * 
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
const calculateNameSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  // Use combined Double Metaphone + Levenshtein score (Option 4)
  return fuzzyMatchService.combinedSimilarity(str1, str2);
};

/**
 * Calculate geographic proximity score
 * Calculer le score de proximité géographique
 * 
 * @param {Object} result - Geocoding result with lat/lng
 * @param {Object} expectedLocation - Expected location (country center, etc.)
 * @returns {number} Proximity score (0-1)
 */
const calculateProximityScore = (result, expectedLocation) => {
  if (!expectedLocation || !expectedLocation.lat || !expectedLocation.lng) {
    return 0.5; // Neutral score if no expected location
  }

  const turf = require('@turf/turf');
  const from = turf.point([result.longitude, result.latitude]);
  const to = turf.point([expectedLocation.lng, expectedLocation.lat]);
  const distance = turf.distance(from, to, { units: 'kilometers' });

  // Score decreases with distance (max 1000km for country-level)
  const maxDistance = 1000;
  return Math.max(0, 1 - (distance / maxDistance));
};

/**
 * Calculate overall confidence score for a geocoding result with detailed breakdown
 * Calculer le score de confiance global pour un résultat de géocodage avec détails
 * 
 * @param {Object} result - Geocoding result
 * @param {string} originalQuery - Original village name query
 * @param {Object} filters - Geographic filters applied
 * @param {Array} allResults - All results from different APIs
 * @param {boolean} includeDetails - Whether to include detailed breakdown
 * @returns {Object} Confidence score and optional details
 */
const calculateConfidenceScore = (result, originalQuery, filters, allResults, includeDetails = false) => {
  // 1. Source reliability score
  const sourceScore = result.reliability || 0.5;
  const sourceExplanation = {
    en: `Source "${result.source}" has a reliability rating of ${Math.round(sourceScore * 100)}%`,
    fr: `La source "${result.source}" a un indice de fiabilité de ${Math.round(sourceScore * 100)}%`
  };

  // 2. Name similarity score
  const extractedName = extractVillageName(result.formattedAddress);
  const nameSimilarity = calculateNameSimilarity(originalQuery, extractedName);
  const nameExplanation = {
    en: `Name similarity between "${originalQuery}" and "${extractedName}": ${Math.round(nameSimilarity * 100)}%`,
    fr: `Similarité entre "${originalQuery}" et "${extractedName}": ${Math.round(nameSimilarity * 100)}%`
  };

  // 3. Geographic proximity score
  let proximityScore = 0.5;
  let proximityExplanation = {
    en: 'No reference location applied - using neutral proximity score',
    fr: 'Aucune localisation de référence - score de proximité neutre'
  };

  // Priority: reference city > country center
  if (filters.refCityLat && filters.refCityLng) {
    const refLocation = { lat: parseFloat(filters.refCityLat), lng: parseFloat(filters.refCityLng) };
    proximityScore = calculateProximityScore(result, refLocation);
    const distanceKm = calculateDistance(result.latitude, result.longitude, refLocation.lat, refLocation.lng);
    const cityName = filters.refCityName || filters.refCityDisplay || 'la ville de référence';
    proximityScore = Math.max(0, 1 - (distanceKm / 500)); // max 500km for city-level
    proximityExplanation = {
      en: `Result is ${Math.round(distanceKm)}km from reference city "${cityName}". Proximity score: ${Math.round(proximityScore * 100)}%`,
      fr: `Le résultat est à ${Math.round(distanceKm)}km de la ville de référence "${cityName}". Score de proximité: ${Math.round(proximityScore * 100)}%`
    };
  } else if (filters.countryCode) {
    const country = getCountryByCode(filters.countryCode);
    if (country) {
      proximityScore = calculateProximityScore(result, country.coordinates);
      const distanceKm = calculateDistanceToCountryCenter(result, country.coordinates);
      proximityExplanation = {
        en: `Result is ${Math.round(distanceKm)}km from ${country.nameEN} center. Proximity score: ${Math.round(proximityScore * 100)}%`,
        fr: `Le résultat est à ${Math.round(distanceKm)}km du centre de ${country.nameFR}. Score de proximité: ${Math.round(proximityScore * 100)}%`
      };
    }
  }

  // 4. Result consistency score (how many APIs returned similar results)
  let consistencyScore = 0;
  let consistentSources = [];
  
  if (allResults.length > 1) {
    const similarResults = allResults.filter(r => {
      if (r === result) return false;
      const distance = calculateDistance(
        result.latitude, result.longitude,
        r.latitude, r.longitude
      );
      if (distance < 5) {
        consistentSources.push(r.source);
        return true;
      }
      return false;
    });
    consistencyScore = similarResults.length / (allResults.length - 1);
  }
  
  const consistencyExplanation = {
    en: consistentSources.length > 0 
      ? `${consistentSources.length} other source(s) confirm this location: ${consistentSources.join(', ')}`
      : 'No other sources confirmed this exact location',
    fr: consistentSources.length > 0
      ? `${consistentSources.length} autre(s) source(s) confirment cette localisation: ${consistentSources.join(', ')}`
      : 'Aucune autre source n\'a confirmé cette localisation exacte'
  };

  // Calculate weighted score
  const confidence = 
    (sourceScore * confidenceWeights.sourceReliability) +
    (nameSimilarity * confidenceWeights.nameSimilarity) +
    (proximityScore * confidenceWeights.geographicProximity) +
    (consistencyScore * confidenceWeights.resultConsistency);

  const finalScore = Math.round(confidence * 100) / 100;

  if (!includeDetails) {
    return finalScore;
  }

  // Return detailed breakdown
  return {
    overall: finalScore,
    percentage: Math.round(finalScore * 100),
    breakdown: {
      sourceReliability: {
        score: Math.round(sourceScore * 100) / 100,
        weight: confidenceWeights.sourceReliability,
        weightedScore: Math.round(sourceScore * confidenceWeights.sourceReliability * 100) / 100,
        explanation: sourceExplanation,
        source: result.source
      },
      nameSimilarity: {
        score: Math.round(nameSimilarity * 100) / 100,
        weight: confidenceWeights.nameSimilarity,
        weightedScore: Math.round(nameSimilarity * confidenceWeights.nameSimilarity * 100) / 100,
        explanation: nameExplanation,
        originalName: originalQuery,
        foundName: extractedName
      },
      geographicProximity: {
        score: Math.round(proximityScore * 100) / 100,
        weight: confidenceWeights.geographicProximity,
        weightedScore: Math.round(proximityScore * confidenceWeights.geographicProximity * 100) / 100,
        explanation: proximityExplanation
      },
      resultConsistency: {
        score: Math.round(consistencyScore * 100) / 100,
        weight: confidenceWeights.resultConsistency,
        weightedScore: Math.round(consistencyScore * confidenceWeights.resultConsistency * 100) / 100,
        explanation: consistencyExplanation,
        consistentSources: consistentSources,
        totalSources: allResults.length
      }
    }
  };
};

/**
 * Calculate distance to country center
 * Calculer la distance au centre du pays
 */
const calculateDistanceToCountryCenter = (result, countryCoords) => {
  if (!countryCoords || !countryCoords.lat || !countryCoords.lng) return 0;
  return calculateDistance(result.latitude, result.longitude, countryCoords.lat, countryCoords.lng);
};

/**
 * Generate similar name suggestions using Levenshtein distance
 * Générer des suggestions de noms similaires avec la distance de Levenshtein
 * 
 * @param {string} originalName - Original village name
 * @param {Array} allResults - All results from different APIs
 * @param {number} maxSuggestions - Maximum number of suggestions
 * @returns {Array} Array of name suggestions with confidence
 */
const generateNameSuggestions = (originalName, allResults, maxSuggestions = 5) => {
  const suggestions = [];
  const seenNames = new Set();
  
  for (const result of allResults) {
    const extractedName = extractVillageName(result.formattedAddress);
    
    if (!extractedName || seenNames.has(extractedName.toLowerCase())) continue;
    seenNames.add(extractedName.toLowerCase());
    
    const similarity = calculateNameSimilarity(originalName, extractedName);
    
    // Only include if not exact match and has some similarity
    if (similarity < 1 && similarity >= 0.3) {
      const distance = levenshtein.get(originalName.toLowerCase(), extractedName.toLowerCase());
      suggestions.push({
        name: extractedName,
        similarity: Math.round(similarity * 100) / 100,
        levenshteinDistance: distance,
        source: result.source,
        confidence: Math.round((similarity * (result.reliability || 0.5)) * 100) / 100,
        coordinates: {
          latitude: result.latitude,
          longitude: result.longitude
        }
      });
    }
  }
  
  // Sort by similarity (descending) and limit
  return suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSuggestions);
};

/**
 * Extract village name from formatted address
 * Extraire le nom du village de l'adresse formatée
 * 
 * @param {string} address - Formatted address
 * @returns {string} Extracted village name
 */
const extractVillageName = (address) => {
  if (!address) return '';
  
  // Usually the first part before comma is the place name
  const parts = address.split(',');
  return parts[0].trim();
};

/**
 * Format address from geocoding result
 * Formater l'adresse à partir du résultat de géocodage
 * 
 * Creates a formatted address string including village name, administrative levels, and country.
 * Handles missing fields gracefully.
 * 
 * @param {Object} result - Geocoding result object
 * @param {Object} filters - Geographic filters applied
 * @returns {string} Formatted address string
 */
const formatAddress = (result, filters = {}) => {
  const parts = [];
  
  // Extract village/locality name from formatted address
  const villageName = extractVillageName(result.formattedAddress);
  if (villageName) {
    parts.push(villageName);
  }
  
  // Add administrative levels from result or filters
  // Admin level 3 (arrondissement/district)
  if (result.adminLevel3 || filters.arrondissement) {
    parts.push(result.adminLevel3 || filters.arrondissement);
  }
  
  // Admin level 2 (department/province)
  if (result.adminLevel2 || filters.department) {
    parts.push(result.adminLevel2 || filters.department);
  }
  
  // Admin level 1 (region/state)
  if (result.adminLevel1 || filters.region) {
    parts.push(result.adminLevel1 || filters.region);
  }
  
  // Country
  if (result.country || filters.country) {
    parts.push(result.country || filters.country);
  }
  
  // Remove duplicates while preserving order
  const uniqueParts = [];
  const seen = new Set();
  for (const part of parts) {
    const normalized = part.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueParts.push(part);
    }
  }
  
  return uniqueParts.join(', ') || result.formattedAddress || '';
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Calculer la distance entre deux coordonnées (formule de Haversine)
 * 
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Geocode a single village with filters
 * Géocoder un seul village avec des filtres
 * 
 * @param {string} villageName - Name of the village
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Geocoding result with confidence score
 */
const geocodeSingleVillage = async (villageName, filters = {}) => {
  // Build search query with context
  let searchQuery = villageName;
  
  // Add geographic context to improve accuracy
  if (filters.arrondissement) searchQuery += `, ${filters.arrondissement}`;
  if (filters.department)     searchQuery += `, ${filters.department}`;
  if (filters.region)         searchQuery += `, ${filters.region}`;
  if (filters.country)        searchQuery += `, ${filters.country}`;

  // Get results from all APIs (including LocationIQ)
  let results = await geocodeWithAllAPIs(searchQuery, filters);

  // ── LocationIQ ─────────────────────────────────────────────────────────
  const locationIQKey = process.env.LOCATIONIQ_API_KEY;
  if (locationIQKey) {
    try {
      const liqResp = await require('axios').get('https://us1.locationiq.com/v1/search', {
        params: {
          key: locationIQKey,
          q: searchQuery,
          format: 'json',
          limit: 3,
          addressdetails: 1,
          countrycodes: filters.countryCode || undefined,
        },
        timeout: 10000,
      });
      const liqResults = (liqResp.data || []).map(r => ({
        source: 'LocationIQ',
        sourceFR: 'LocationIQ',
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        formattedAddress: r.display_name,
        country: r.address?.country,
        adminLevel1: r.address?.state,
        adminLevel2: r.address?.county,
        adminLevel3: r.address?.suburb || r.address?.village,
        reliability: 0.82,
      }));
      results.push(...liqResults);
    } catch (liqErr) {
      console.warn('[LocationIQ] error:', liqErr.message);
    }
  }

  // Enrich with GeoAgent (multi-source + AI scoring)
  // FIX 2 — Pass full filters (incl. refCityLat/Lng/Name) so geoAgent prioritises ref city area
  try {
    const { geoAgent } = require('./geoAgent');
    const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '', filters);
    if (agentResult && agentResult.found && agentResult.latitude && agentResult.longitude) {
      results.unshift({
        source: agentResult.source || 'GeoAgent (AI)',
        sourceFR: agentResult.source || 'GeoAgent (IA)',
        latitude: agentResult.latitude,
        longitude: agentResult.longitude,
        formattedAddress: agentResult.label || agentResult.villageName || villageName,
        country: agentResult.country,
        region: agentResult.region,
        reliability: agentResult.aiSelected ? 0.95 : 0.88,
        aiSelected: agentResult.aiSelected || false,
        alternatives: agentResult.alternatives || [],
        raw: agentResult
      });
    }
  } catch (agentErr) {
    console.warn('[GeocodingService] GeoAgent enrichment failed:', agentErr.message);
  }

  // ── Geographic boundary filtering ──────────────────────────────────────
  // 1. Filter by radius if center + radius provided
  if (filters.centerLat && filters.centerLng && filters.radius) {
    const centerLat = parseFloat(filters.centerLat);
    const centerLng = parseFloat(filters.centerLng);
    const searchRadius = parseFloat(filters.radius);
    if (!isNaN(centerLat) && !isNaN(centerLng) && !isNaN(searchRadius) && searchRadius > 0) {
      console.log(`[Geocoding] Filtering by radius: ${searchRadius}km`);
      results = results.filter(r => {
        const dist = calculateDistance(centerLat, centerLng, r.latitude, r.longitude);
        return dist <= searchRadius;
      });
      console.log(`[Geocoding] After radius filter: ${results.length} results`);
    }
  }

  // 2. Filter by admin boundaries (region / department / arrondissement)
  //    We do a soft match: if the result's admin fields contain the filter value
  const normalizeStr = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  if (filters.region) {
    const filterRegion = normalizeStr(filters.region);
    const filtered = results.filter(r => {
      const addr = normalizeStr(r.formattedAddress || '');
      const admin1 = normalizeStr(r.adminLevel1 || r.region || '');
      return addr.includes(filterRegion) || admin1.includes(filterRegion) || filterRegion.includes(admin1);
    });
    // Only apply if it reduces results (don't discard everything)
    if (filtered.length > 0) {
      results = filtered;
      console.log(`[Geocoding] After region filter "${filters.region}": ${results.length} results`);
    } else {
      console.warn(`[Geocoding] Region filter "${filters.region}" excluded all results — keeping all`);
    }
  }

  if (filters.department) {
    const filterDept = normalizeStr(filters.department);
    const filtered = results.filter(r => {
      const addr = normalizeStr(r.formattedAddress || '');
      const admin2 = normalizeStr(r.adminLevel2 || r.department || '');
      return addr.includes(filterDept) || admin2.includes(filterDept) || filterDept.includes(admin2);
    });
    if (filtered.length > 0) {
      results = filtered;
      console.log(`[Geocoding] After department filter "${filters.department}": ${results.length} results`);
    } else {
      console.warn(`[Geocoding] Department filter "${filters.department}" excluded all results — keeping all`);
    }
  }

  if (filters.arrondissement) {
    const filterArr = normalizeStr(filters.arrondissement);
    const filtered = results.filter(r => {
      const addr = normalizeStr(r.formattedAddress || '');
      const admin3 = normalizeStr(r.adminLevel3 || r.arrondissement || '');
      return addr.includes(filterArr) || admin3.includes(filterArr) || filterArr.includes(admin3);
    });
    if (filtered.length > 0) {
      results = filtered;
      console.log(`[Geocoding] After arrondissement filter "${filters.arrondissement}": ${results.length} results`);
    } else {
      console.warn(`[Geocoding] Arrondissement filter "${filters.arrondissement}" excluded all results — keeping all`);
    }
  }

  if (results.length === 0) {
    // Try fuzzy matching if no exact results
    if (geocodingSettings.enableFuzzyMatching) {
      return await fuzzyMatchVillage(villageName, filters);
    }
    
    return {
      villageName,
      found: false,
      confidence: 0,
      message: {
        en: 'Village not found',
        fr: 'Village non trouvé'
      }
    };
  }

  // Calculate confidence scores for all results (with details for best result)
  const scoredResults = results.map((result, index) => ({
    ...result,
    confidence: calculateConfidenceScore(result, villageName, filters, results, false)
  }));

  // Sort by confidence score
  scoredResults.sort((a, b) => b.confidence - a.confidence);

  // FIX 3 — Filtrer les résultats dont le nom est trop éloigné du village cherché.
  // Évite de retourner les coordonnées du pays quand le village est introuvable.
  const validResults = scoredResults.filter(r => {
    const extracted = extractVillageName(r.formattedAddress);
    return calculateNameSimilarity(villageName, extracted) >= 0.25;
  });

  if (validResults.length === 0) {
    return {
      villageName,
      found: false,
      confidence: 0,
      message: { en: 'Village not found', fr: 'Village non trouvé' }
    };
  }

  const bestResult = validResults[0];
  
  // Get detailed confidence breakdown for the best result
  const confidenceDetails = calculateConfidenceScore(bestResult, villageName, filters, results, true);
  
  // Generate name suggestions if similarity is not 100%
  const nameSuggestions = generateNameSuggestions(villageName, validResults, 5);
  
  // Generate formatted address
  const formattedAddressDisplay = formatAddress(bestResult, filters);
  
  // Calculate border proximity if coordinates are available
  let borderProximity = null;
  if (bestResult.latitude && bestResult.longitude && filters.countryCode) {
    borderProximity = calculateBorderProximity(
      bestResult.latitude,
      bestResult.longitude,
      filters.countryCode
    );
  }
  
  // Build response object
  const response = {
    villageName,
    found: true,
    latitude: bestResult.latitude,
    longitude: bestResult.longitude,
    formattedAddress: bestResult.formattedAddress,
    formattedAddressDisplay: formattedAddressDisplay,
    source: bestResult.source,
    sourceFR: bestResult.sourceFR,
    confidence: bestResult.confidence,
    confidenceLevel: getConfidenceLevel(bestResult.confidence),
    confidenceDetails: confidenceDetails,
    borderProximity: borderProximity,
    alternativeResults: validResults.slice(1, 4), // Top 3 alternatives
    filters: filters
  };
  
  // Add name suggestions if there are any and name similarity is not perfect
  if (nameSuggestions.length > 0) {
    response.nameSuggestions = nameSuggestions;
  }
  
  return response;
};

/**
 * Get confidence level label
 * Obtenir le libellé du niveau de confiance
 * 
 * @param {number} confidence - Confidence score (0-1)
 * @returns {Object} Confidence level with labels
 */
const getConfidenceLevel = (confidence) => {
  if (confidence >= geocodingSettings.highConfidenceThreshold) {
    return { level: 'high', labelEN: 'High', labelFR: 'Élevé', color: '#4CAF50' };
  } else if (confidence >= geocodingSettings.minConfidenceThreshold) {
    return { level: 'medium', labelEN: 'Medium', labelFR: 'Moyen', color: '#FF9800' };
  } else {
    return { level: 'low', labelEN: 'Low', labelFR: 'Faible', color: '#F44336' };
  }
};

/**
 * Fuzzy match village name when exact match not found
 * Correspondance floue du nom de village quand aucune correspondance exacte
 * 
 * @param {string} villageName - Original village name
 * @param {Object} filters - Geographic filters
 * @returns {Promise<Object>} Fuzzy match result
 */
const fuzzyMatchVillage = async (villageName, filters) => {
  // Try variations of the village name
  const variations = generateNameVariations(villageName);
  
  for (const variation of variations) {
    const results = await geocodeWithAllAPIs(variation, filters);
    
    if (results.length > 0) {
      const bestResult = results[0];
      const similarity = calculateNameSimilarity(villageName, extractVillageName(bestResult.formattedAddress));
      
      if (similarity >= 0.45) { // FIX 3 — seuil relevé pour éviter les faux positifs (ex: nom du pays)
        return {
          villageName,
          found: true,
          fuzzyMatch: true,
          matchedName: extractVillageName(bestResult.formattedAddress),
          latitude: bestResult.latitude,
          longitude: bestResult.longitude,
          formattedAddress: bestResult.formattedAddress,
          source: bestResult.source,
          sourceFR: bestResult.sourceFR,
          confidence: similarity * bestResult.reliability,
          confidenceLevel: getConfidenceLevel(similarity * bestResult.reliability),
          message: {
            en: `Fuzzy match found: "${extractVillageName(bestResult.formattedAddress)}"`,
            fr: `Correspondance approximative trouvée: "${extractVillageName(bestResult.formattedAddress)}"`
          }
        };
      }
    }
  }

  return {
    villageName,
    found: false,
    confidence: 0,
    suggestions: variations.slice(0, 3),
    message: {
      en: 'Village not found',
      fr: 'Village non trouvé'
    }
  };
};

/**
 * Generate name variations for fuzzy matching
 * Générer des variations de nom pour la correspondance floue
 * 
 * @param {string} name - Original name
 * @returns {Array<string>} Array of name variations
 */
const generateNameVariations = (name) => {
  const variations = [];
  const normalized = name.trim();
  
  // Remove common prefixes/suffixes
  const prefixes = ['village de ', 'village ', 'ville de ', 'ville '];
  const suffixes = [' village', ' ville', ' city'];
  
  let baseName = normalized.toLowerCase();
  
  for (const prefix of prefixes) {
    if (baseName.startsWith(prefix)) {
      baseName = baseName.substring(prefix.length);
      break;
    }
  }
  
  for (const suffix of suffixes) {
    if (baseName.endsWith(suffix)) {
      baseName = baseName.substring(0, baseName.length - suffix.length);
      break;
    }
  }
  
  variations.push(baseName);
  
  // Replace common character variations
  variations.push(baseName.replace(/é/g, 'e'));
  variations.push(baseName.replace(/è/g, 'e'));
  variations.push(baseName.replace(/ê/g, 'e'));
  variations.push(baseName.replace(/à/g, 'a'));
  variations.push(baseName.replace(/â/g, 'a'));
  variations.push(baseName.replace(/ô/g, 'o'));
  variations.push(baseName.replace(/î/g, 'i'));
  variations.push(baseName.replace(/ù/g, 'u'));
  variations.push(baseName.replace(/û/g, 'u'));

  // Phonetic variations
  // y <-> i
  variations.push(baseName.replace(/y/g, 'i'));
  variations.push(baseName.replace(/i/g, 'y'));
  // ou -> u and u -> ou
  variations.push(baseName.replace(/ou/g, 'u'));
  variations.push(baseName.replace(/(?<![aeiou])u(?![aeiou])/g, 'ou'));
  // kh -> k
  variations.push(baseName.replace(/kh/g, 'k'));
  // ph -> f
  variations.push(baseName.replace(/ph/g, 'f'));
  // Double consonants -> single
  variations.push(baseName.replace(/([bcdfghjklmnpqrstvwxz])\1+/g, '$1'));
  // Remove intercalary h (e.g. Bahma -> Bama)
  variations.push(baseName.replace(/(?<=[a-z])h(?=[a-z])/g, ''));

  // Remove duplicates
  return [...new Set(variations)];
};

/**
 * Batch geocode multiple villages
 * Géocoder plusieurs villages par lots
 * 
 * @param {Array<string>} villageNames - Array of village names
 * @param {Object} filters - Geographic filters
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Batch geocoding results
 */
const batchGeocodeVillages = async (villageNames, filters = {}, progressCallback = null) => {
  const results = [];
  const total = villageNames.length;
  let processed = 0;
  let found = 0;
  let notFound = 0;
  let lowConfidence = 0;

  for (const villageName of villageNames) {
    try {
      const result = await geocodeSingleVillage(villageName, filters);
      results.push(result);

      if (result.found) {
        found++;
        if (result.confidence < geocodingSettings.minConfidenceThreshold) {
          lowConfidence++;
        }
      } else {
        notFound++;
      }

      processed++;

      // Call progress callback if provided
      if (progressCallback) {
        progressCallback({
          processed,
          total,
          percentage: Math.round((processed / total) * 100),
          currentVillage: villageName,
          found,
          notFound,
          lowConfidence
        });
      }

      // Delay between requests to respect rate limits
      await delay(geocodingSettings.batchDelay);
    } catch (error) {
      console.error(`Error geocoding ${villageName}:`, error.message);
      results.push({
        villageName,
        found: false,
        error: true,
        message: {
          en: `Error: ${error.message}`,
          fr: `Erreur: ${error.message}`
        }
      });
      notFound++;
      processed++;
    }
  }

  return {
    results,
    statistics: {
      total,
      found,
      notFound,
      lowConfidence,
      successRate: Math.round((found / total) * 100)
    }
  };
};

/**
 * Delay helper function
 * Fonction d'aide pour le délai
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  geocodeSingleVillage,
  batchGeocodeVillages,
  calculateConfidenceScore,
  calculateNameSimilarity,
  calculateDistance,
  getConfidenceLevel,
  reverseGeocode
};
