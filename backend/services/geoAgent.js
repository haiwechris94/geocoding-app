/**
 * GeoAgent Enhanced — Multi-Source Village Geocoder
 * Intègre : Nominatim, GeoNames, OpenCage, Google Maps,
 *            Overpass (OSM), Wikidata, Brave Search
 * 
 * Utilise Levenshtein pour corriger les fautes de frappe
 * L'IA (DeepSeek) choisit le meilleur résultat final
 */

const axios = require('axios');

// ── Import new services ────────────────────────────────────────────────────
const overpassService   = require('./overpassService');
const wikidataService   = require('./wikidataService');
const braveSearchService = require('./braveSearchService');

// ── Levenshtein distance (already installed) ───────────────────────────────
let levenshtein;
try { levenshtein = require('fast-levenshtein'); } catch (e) {}

const similarity = (a, b) => {
  if (!levenshtein) return 1;
  const dist = levenshtein.get(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
};

// ── Haversine ──────────────────────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ── Nominatim ──────────────────────────────────────────────────────────────
const searchNominatim = async (villageName, country) => {
  try {
    const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${villageName}${country ? ', ' + country : ''}`, format: 'json', limit: 3, addressdetails: 1 },
      headers: { 'User-Agent': 'VillagePointApp/1.0 contact@villagepoint.app' },
      timeout: 10000,
    });
    return (resp.data || []).map(r => ({
      villageName: r.display_name.split(',')[0],
      found: true,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      source: 'Nominatim',
      label: r.display_name,
      confidence: parseFloat(r.importance || 0.5),
      reliability: 'medium',
    }));
  } catch (e) {
    console.warn('[Nominatim] error:', e.message);
    return [];
  }
};

// ── GeoNames ───────────────────────────────────────────────────────────────
const searchGeoNames = async (villageName, country) => {
  const username = process.env.GEONAMES_USERNAME;
  if (!username) return [];
  try {
    const resp = await axios.get('http://api.geonames.org/searchJSON', {
      params: { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },
      timeout: 10000,
    });
    return (resp.data?.geonames || []).map(r => ({
      villageName: r.name,
      found: true,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lng),
      source: 'GeoNames',
      country: r.countryName,
      region: r.adminName1,
      population: r.population || null,
      label: `${r.name}, ${r.adminName1}, ${r.countryName}`,
      confidence: 0.80,
      reliability: 'medium',
    }));
  } catch (e) {
    console.warn('[GeoNames] error:', e.message);
    return [];
  }
};

// ── OpenCage ───────────────────────────────────────────────────────────────
const searchOpenCage = async (villageName, country) => {
  const key = process.env.OPENCAGE_API_KEY;
  if (!key) return [];
  try {
    const resp = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: { q: `${villageName}${country ? ', ' + country : ''}`, key, limit: 3, no_annotations: 1 },
      timeout: 10000,
    });
    return (resp.data?.results || []).map(r => ({
      villageName: r.components.village || r.components.town || r.components.city || villageName,
      found: true,
      latitude: r.geometry.lat,
      longitude: r.geometry.lng,
      source: 'OpenCage',
      country: r.components.country,
      region: r.components.state,
      label: r.formatted,
      confidence: r.confidence / 10,
      reliability: r.confidence >= 7 ? 'high' : 'medium',
    }));
  } catch (e) {
    console.warn('[OpenCage] error:', e.message);
    return [];
  }
};

// ── Photon ─────────────────────────────────────────────────────────────────
const searchPhoton = async (villageName, country) => {
  try {
    const resp = await axios.get('https://photon.komoot.io/api/', {
      params: { q: `${villageName}${country ? ', ' + country : ''}`, limit: 3 },
      timeout: 10000,
    });
    return (resp.data?.features || []).map(f => {
      const p = f.properties;
      return {
        villageName: p.name || villageName,
        found: true,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        source: 'Photon (Komoot)',
        country: p.country,
        region: p.state,
        label: [p.name, p.city, p.country].filter(Boolean).join(', '),
        confidence: 0.75,
        reliability: 'medium',
      };
    });
  } catch (e) {
    console.warn('[Photon] error:', e.message);
    return [];
  }
};

// ── AI scoring via DeepSeek ────────────────────────────────────────────────
const scoreWithAI = async (villageName, country, candidates) => {
  const key = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  if (!key || candidates.length === 0) return candidates[0] || null;

  try {
    const prompt = `You are a geocoding expert for African villages.
Given the query: "${villageName}"${country ? ' in ' + country : ''}
Choose the BEST matching result from these candidates. Return ONLY the index number (0, 1, 2...).

Candidates:
${candidates.map((c, i) => `${i}: ${c.villageName} (${c.latitude?.toFixed(4)}, ${c.longitude?.toFixed(4)}) source=${c.source} confidence=${c.confidence}`).join('\n')}

Return only a single number.`;

    const resp = await axios.post(`${baseUrl}/v1/chat/completions`, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 5,
      temperature: 0,
    }, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 8000,
    });

    const idx = parseInt(resp.data?.choices?.[0]?.message?.content?.trim());
    if (!isNaN(idx) && candidates[idx]) {
      return { ...candidates[idx], aiSelected: true };
    }
  } catch (e) {
    console.warn('[AI Scoring] error:', e.message);
  }
  return candidates[0];
};

// ── Main GeoAgent function ─────────────────────────────────────────────────
const geoAgent = async (villageName, country = '') => {
  console.log(`[GeoAgent] Searching: "${villageName}" country="${country}"`);

  // Run all sources in parallel
  const [
    nominatimResults,
    geonamesResults,
    opencageResults,
    photonResults,
    overpassResults,
    wikidataResults,
    braveResults,
  ] = await Promise.allSettled([
    searchNominatim(villageName, country),
    searchGeoNames(villageName, country),
    searchOpenCage(villageName, country),
    searchPhoton(villageName, country),
    overpassService.searchVillageGlobal(villageName, null),
    wikidataService.geocodeVillage(villageName, country),
    braveSearchService.searchVillage(villageName, country),
  ]);

  // Collect all successful results
  const allCandidates = [
    ...(nominatimResults.status === 'fulfilled' ? nominatimResults.value : []),
    ...(geonamesResults.status  === 'fulfilled' ? geonamesResults.value  : []),
    ...(opencageResults.status  === 'fulfilled' ? opencageResults.value  : []),
    ...(photonResults.status    === 'fulfilled' ? photonResults.value    : []),
    ...(overpassResults.status  === 'fulfilled' ? overpassResults.value  : []),
    ...(wikidataResults.status  === 'fulfilled' ? wikidataResults.value  : []),
    ...(braveResults.status     === 'fulfilled' ? braveResults.value     : []),
  ].filter(r => r && r.latitude && r.longitude);

  console.log(`[GeoAgent] Total candidates: ${allCandidates.length}`);

  if (allCandidates.length === 0) {
    return { found: false, villageName, error: 'No results from any source' };
  }

  // Score by name similarity + source weight
  const scored = allCandidates.map(c => {
    const nameSim = similarity(villageName, c.villageName || '');
    const sourceWeight = {
      'Wikidata': 1.0, 'Wikidata (SPARQL)': 1.0,
      'GeoNames': 0.95, 'OpenCage': 0.92,
      'Overpass (OpenStreetMap)': 0.90,
      'Nominatim': 0.88, 'Photon (Komoot)': 0.82,
      'Brave Web Search': 0.60,
    }[c.source] || 0.7;

    return {
      ...c,
      score: (nameSim * 0.5) + ((c.confidence || 0.7) * 0.3) + (sourceWeight * 0.2),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Deduplicate: group within 1km of each other
  const deduplicated = [];
  for (const cand of scored) {
    const isDup = deduplicated.some(existing =>
      haversine(existing.latitude, existing.longitude, cand.latitude, cand.longitude) < 1
    );
    if (!isDup) deduplicated.push(cand);
  }

  // Let AI pick the best from top candidates
  const best = await scoreWithAI(villageName, country, deduplicated.slice(0, 5));

  return {
    ...best,
    found: true,
    alternatives: deduplicated.slice(0, 5),
    totalSources: allCandidates.length,
  };
};

// ── Similar village suggestions ────────────────────────────────────────────
const suggestSimilarVillages = async (villageName, country = '') => {
  try {
    const [nominatim, overpass, wikidata] = await Promise.allSettled([
      searchNominatim(villageName, country),
      overpassService.searchVillageGlobal(villageName, null),
      wikidataService.searchVillage(villageName, country),
    ]);

    const all = [
      ...(nominatim.status === 'fulfilled' ? nominatim.value : []),
      ...(overpass.status  === 'fulfilled' ? overpass.value  : []),
      ...(wikidata.status  === 'fulfilled' ? wikidata.value  : []),
    ];

    const suggestions = [...new Set(
      all.map(r => r.villageName).filter(n => n && n.toLowerCase() !== villageName.toLowerCase())
    )].slice(0, 10);

    return suggestions;
  } catch (e) {
    console.error('[GeoAgent] suggestSimilarVillages error:', e.message);
    return [];
  }
};

module.exports = { geoAgent, suggestSimilarVillages };
