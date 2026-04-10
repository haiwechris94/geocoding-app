/**
 * GeoAgent v3 — Architecture en 4 niveaux
 *
 * 🟢 TIER 1 Core      : Nominatim + GeoNames + Overpass  (gratuit, toujours actif)
 * 🟡 TIER 2 Complement: OpenCage || LocationIQ            (si Tier 1 insuffisant)
 * 🔵 TIER 3 Intelligence: DeepSeek                        (sélection finale IA)
 * 🔴 TIER 4 Premium   : Google Maps                       (fallback ultime)
 *
 * Optimisations vitesse :
 *  - Cache en mémoire 1h pour éviter les appels répétés
 *  - Early exit si un résultat Tier1 a nameSim >= 0.85
 *  - Timeouts courts (6s core, 8s complement)
 *  - Tier 2 lancé uniquement si Tier1 insuffisant
 *  - Commentaire IA généré en arrière-plan (non bloquant)
 *  - Wikidata/Brave supprimés du flux principal (trop lents/instables)
 */

const axios = require('axios');
const overpassService   = require('./overpassService');
const fuzzyMatchService = require('./fuzzyMatchService');

// ── Cache en mémoire (TTL 1h) ──────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 heure

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const cacheSet = (key, data) => cache.set(key, { data, ts: Date.now() });

// ── Similarity phonétique (Levenshtein + Double Metaphone) ─────────────────
const similarity = (a, b) => {
  if (!a || !b) return 0;
  try { return fuzzyMatchService.combinedSimilarity(a, b); } catch (e) {
    // Fallback Levenshtein pur
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return 1;
    const len = Math.max(s1.length, s2.length);
    if (len === 0) return 1;
    let dist = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) if (s1[i] !== s2[i]) dist++;
    dist += Math.abs(s1.length - s2.length);
    return 1 - dist / len;
  }
};

// ── Haversine ──────────────────────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ═══════════════════════════════════════════════════════════════════════════
// 🟢 TIER 1 — CORE (gratuit, sans clé, toujours actif)
// ═══════════════════════════════════════════════════════════════════════════

const searchNominatim = async (query, country, refLat, refLng) => {
  const cacheKey = `nominatim:${query}:${country}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Build viewbox if refCity set (restrict search to ~200km around refCity)
  const params = {
    q: `${query}${country ? ', ' + country : ''}`,
    format: 'json',
    limit: 5,
    addressdetails: 1,
    'accept-language': 'fr,en',
  };
  if (refLat && refLng) {
    const delta = 2.0; // ~200km
    params.viewbox = `${refLng - delta},${refLat - delta},${refLng + delta},${refLat + delta}`;
    params.bounded = 0; // show outside viewbox too but prefer inside
  }

  try {
    const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
      params,
      headers: { 'User-Agent': 'VillagePointApp/1.0 contact@villagepoint.app' },
      timeout: 6000,
    });
    const results = (resp.data || []).map(r => ({
      villageName: r.display_name.split(',')[0].trim(),
      found: true,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      source: 'Nominatim',
      label: r.display_name,
      confidence: Math.min(parseFloat(r.importance || 0.5) + 0.1, 1.0),
      reliability: 0.85,
      tier: 1,
    }));
    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[Nominatim] error:', e.message);
    return [];
  }
};

const searchGeoNames = async (villageName, country) => {
  const username = process.env.GEONAMES_USERNAME;
  if (!username) return [];

  const cacheKey = `geonames:${villageName}:${country}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const resp = await axios.get('http://api.geonames.org/searchJSON', {
      params: {
        q: villageName,
        country: country || '',
        maxRows: 5,
        username,
        featureClass: 'P',
        style: 'MEDIUM',
      },
      timeout: 6000,
    });
    const results = (resp.data?.geonames || []).map(r => ({
      villageName: r.name,
      found: true,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lng),
      source: 'GeoNames',
      country: r.countryName,
      region: r.adminName1,
      population: r.population || null,
      label: `${r.name}, ${r.adminName1 || ''}, ${r.countryName}`,
      confidence: 0.82,
      reliability: 0.88,
      tier: 1,
    }));
    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[GeoNames] error:', e.message);
    return [];
  }
};

const searchOverpass = async (villageName, refLat, refLng) => {
  const cacheKey = `overpass:${villageName}:${refLat}:${refLng}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    let results;
    if (refLat && refLng) {
      results = await overpassService.searchVillageInRadius(villageName, refLat, refLng, 150);
    } else {
      results = await overpassService.searchVillageGlobal(villageName, null);
    }
    const mapped = (results || []).map(r => ({ ...r, tier: 1, reliability: 0.88 }));
    cacheSet(cacheKey, mapped);
    return mapped;
  } catch (e) {
    console.warn('[Overpass] error:', e.message);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🟡 TIER 2 — COMPLEMENT (lancé si Tier1 insuffisant)
// ═══════════════════════════════════════════════════════════════════════════

const searchOpenCage = async (query, country) => {
  const key = process.env.OPENCAGE_API_KEY;
  if (!key) return [];

  const cacheKey = `opencage:${query}:${country}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const resp = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: `${query}${country ? ', ' + country : ''}`,
        key,
        limit: 3,
        no_annotations: 1,
        language: 'fr',
      },
      timeout: 8000,
    });
    const results = (resp.data?.results || []).map(r => ({
      villageName: r.components.village || r.components.town || r.components.city || query.split(',')[0],
      found: true,
      latitude: r.geometry.lat,
      longitude: r.geometry.lng,
      source: 'OpenCage',
      country: r.components.country,
      region: r.components.state,
      label: r.formatted,
      confidence: r.confidence / 10,
      reliability: 0.88,
      tier: 2,
    }));
    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[OpenCage] error:', e.message);
    return [];
  }
};

const searchLocationIQ = async (query, country) => {
  const key = process.env.LOCATIONIQ_API_KEY;
  if (!key) return [];

  const cacheKey = `locationiq:${query}:${country}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const resp = await axios.get('https://us1.locationiq.com/v1/search', {
      params: {
        key,
        q: `${query}${country ? ', ' + country : ''}`,
        format: 'json',
        limit: 3,
        addressdetails: 1,
        'accept-language': 'fr',
      },
      timeout: 8000,
    });
    const results = (resp.data || []).map(r => ({
      villageName: r.display_name.split(',')[0].trim(),
      found: true,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      source: 'LocationIQ',
      label: r.display_name,
      confidence: 0.82,
      reliability: 0.82,
      tier: 2,
    }));
    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[LocationIQ] error:', e.message);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔴 TIER 4 — GOOGLE MAPS (fallback ultime, seulement si tout échoue)
// ═══════════════════════════════════════════════════════════════════════════

const searchGoogleMaps = async (query, country) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return [];

  const cacheKey = `google:${query}:${country}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const resp = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: `${query}${country ? ', ' + country : ''}`,
        key,
        language: 'fr',
        region: 'africa',
      },
      timeout: 8000,
    });
    const results = (resp.data?.results || []).map(r => ({
      villageName: r.address_components[0]?.long_name || query,
      found: true,
      latitude: r.geometry.location.lat,
      longitude: r.geometry.location.lng,
      source: 'Google Maps',
      label: r.formatted_address,
      confidence: 0.95,
      reliability: 0.95,
      tier: 4,
    }));
    cacheSet(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[Google Maps] error:', e.message);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔵 TIER 3 — DEEPSEEK (sélection intelligente parmi les finalistes)
// ═══════════════════════════════════════════════════════════════════════════

const scoreWithAI = async (villageName, country, candidates) => {
  const key     = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  if (!key || !candidates || candidates.length === 0) return candidates?.[0] || null;

  try {
    const prompt = `Geocoding expert for African villages. Query: "${villageName}"${country ? ' in ' + country : ''}.
Pick the BEST match. Return ONLY the index number.

${candidates.map((c, i) => `${i}: ${c.villageName} (${c.latitude?.toFixed(4)}, ${c.longitude?.toFixed(4)}) src=${c.source}`).join('\n')}`;

    const resp = await axios.post(`${baseUrl}/v1/chat/completions`, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3,
      temperature: 0,
    }, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 6000,
    });

    const idx = parseInt(resp.data?.choices?.[0]?.message?.content?.trim());
    if (!isNaN(idx) && candidates[idx]) return { ...candidates[idx], aiSelected: true };
  } catch (e) {
    console.warn('[DeepSeek] scoring error:', e.message);
  }
  return candidates[0];
};

// ── Detect country-center coordinates (trop rondes = centroïde pays) ──────
const isCountryCentroid = (lat, lng) => {
  const latDec = String(lat).includes('.') ? String(lat).split('.')[1].length : 0;
  const lngDec = String(lng).includes('.') ? String(lng).split('.')[1].length : 0;
  return latDec <= 1 && lngDec <= 1;
};

// ── Noms de pays à rejeter comme résultat de village ─────────────────────
const COUNTRY_NAMES = new Set([
  'cameroon','cameroun','nigeria','ghana','senegal','sénégal','mali',
  'burkina faso','niger','chad','tchad','ivory coast',"côte d'ivoire",
  'guinea','guinée','togo','benin','bénin','liberia','sierra leone',
  'gambia','mauritania','mauritanie','gabon','congo','angola','kenya',
  'ethiopia','éthiopie','tanzania','tanzanie','uganda','ouganda',
  'mozambique','zambia','zimbabwe','malawi','madagascar','somalia',
  'sudan','soudan','libya','libye','egypt','égypte','morocco','maroc',
  'algeria','algérie','tunisia','tunisie','africa','afrique',
]);
const isCountryName = (name) => name ? COUNTRY_NAMES.has(name.toLowerCase().trim()) : false;

// ── Filtre anti-résultats pays ─────────────────────────────────────────────
const filterCountryResults = (candidates) =>
  candidates.filter(c => {
    if (isCountryCentroid(c.latitude, c.longitude)) {
      console.log(`[GeoAgent] Rejeté centroïde: ${c.villageName} [${c.latitude}, ${c.longitude}]`);
      return false;
    }
    if (isCountryName(c.villageName)) {
      console.log(`[GeoAgent] Rejeté nom pays: ${c.villageName}`);
      return false;
    }
    return true;
  });

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 SCORE & RANK
// ═══════════════════════════════════════════════════════════════════════════

const scoreAndRank = (candidates, villageName, refLat, refLng) => {
  const SOURCE_WEIGHTS = {
    'GeoNames': 0.95, 'OpenCage': 0.92, 'LocationIQ': 0.90,
    'Overpass (OpenStreetMap)': 0.90, 'Nominatim': 0.88,
    'Google Maps': 0.95, 'Photon (Komoot)': 0.80,
  };

  return candidates
    .map(c => {
      const nameSim       = similarity(villageName, c.villageName || '');
      const sourceWeight  = SOURCE_WEIGHTS[c.source] || 0.75;
      const reliabilityW  = typeof c.reliability === 'number' ? c.reliability : 0.75;

      let proximityBoost = 0;
      if (refLat && refLng && c.latitude && c.longitude) {
        const dist = haversine(refLat, refLng, c.latitude, c.longitude);
        proximityBoost = dist <= 30 ? 0.25 : dist <= 80 ? 0.15 : dist <= 150 ? 0.07 : 0;
      }

      return {
        ...c,
        _nameSim: nameSim,
        score: (nameSim * 0.45) + (reliabilityW * 0.25) + (sourceWeight * 0.15) + (proximityBoost * 0.15),
      };
    })
    .filter(c => c._nameSim >= 0.25) // Reject clearly wrong matches
    .sort((a, b) => b.score - a.score);
};

// ── Deduplicate within 1km ─────────────────────────────────────────────────
const deduplicate = (candidates) => {
  const out = [];
  for (const c of candidates) {
    if (!out.some(e => haversine(e.latitude, e.longitude, c.latitude, c.longitude) < 1))
      out.push(c);
  }
  return out;
};

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 MAIN GEOAGENT
// ═══════════════════════════════════════════════════════════════════════════

const geoAgent = async (villageName, country = '', filters = {}) => {
  const t0 = Date.now();
  console.log(`[GeoAgent] "${villageName}" country="${country}"`);

  const refLat     = filters.refCityLat  ? parseFloat(filters.refCityLat)  : null;
  const refLng     = filters.refCityLng  ? parseFloat(filters.refCityLng)  : null;
  const refName    = filters.refCityName || '';
  const locationQ  = refName ? `${villageName}, near ${refName}, ${country}` : villageName;

  // ── TIER 1: Core sources in parallel ──────────────────────────────────
  const [nomRes, geoRes, ovpRes] = await Promise.allSettled([
    searchNominatim(locationQ, country, refLat, refLng),
    searchGeoNames(villageName, country),
    searchOverpass(villageName, refLat, refLng),
  ]);

  let tier1 = [
    ...(nomRes.status === 'fulfilled' ? nomRes.value : []),
    ...(geoRes.status === 'fulfilled' ? geoRes.value : []),
    ...(ovpRes.status === 'fulfilled' ? ovpRes.value : []),
  ].filter(r => r?.latitude && r?.longitude);

  // Rejeter centroïdes pays et noms de pays
  tier1 = filterCountryResults(tier1);
  let ranked = scoreAndRank(tier1, villageName, refLat, refLng);

  console.log(`[GeoAgent] Tier1: ${tier1.length} candidates, ${ranked.length} after filter (${Date.now()-t0}ms)`);

  // ── Early exit: if top result has very high similarity, skip Tier 2 ───
  const EARLY_EXIT_THRESHOLD = 0.82;
  if (ranked.length > 0 && ranked[0]._nameSim >= EARLY_EXIT_THRESHOLD) {
    console.log(`[GeoAgent] Early exit — high confidence (${ranked[0]._nameSim.toFixed(2)})`);
    const dedup  = deduplicate(ranked);
    const best   = dedup[0];
    _generateCommentAsync(villageName, country, best.latitude, best.longitude, filters.language || 'fr');
    return { ...best, found: true, alternatives: dedup.slice(1, 5), totalSources: tier1.length };
  }

  // ── TIER 2: Complement (OpenCage || LocationIQ) ───────────────────────
  const hasOpenCage   = !!process.env.OPENCAGE_API_KEY;
  const hasLocationIQ = !!process.env.LOCATIONIQ_API_KEY;

  if (hasOpenCage || hasLocationIQ) {
    const [comp1, comp2] = await Promise.allSettled([
      hasOpenCage   ? searchOpenCage(locationQ, country)   : Promise.resolve([]),
      hasLocationIQ ? searchLocationIQ(locationQ, country) : Promise.resolve([]),
    ]);
    const tier2 = filterCountryResults([
      ...(comp1.status === 'fulfilled' ? comp1.value : []),
      ...(comp2.status === 'fulfilled' ? comp2.value : []),
    ].filter(r => r?.latitude && r?.longitude));

    const allCandidates = [...tier1, ...tier2];
    ranked = scoreAndRank(allCandidates, villageName, refLat, refLng);
    console.log(`[GeoAgent] Tier2: +${tier2.length} candidates (${Date.now()-t0}ms)`);
  }

  // ── TIER 4: Google Maps fallback (only if still no good result) ───────
  if (ranked.length === 0 || ranked[0]._nameSim < 0.35) {
    console.log('[GeoAgent] Tier4: Google Maps fallback');
    const googleRes = await searchGoogleMaps(locationQ, country);
    if (googleRes.length > 0) {
      ranked = scoreAndRank([...ranked, ...googleRes], villageName, refLat, refLng);
    }
  }

  if (ranked.length === 0) {
    console.warn(`[GeoAgent] No result for "${villageName}"`);
    return { found: false, villageName, error: 'Village non trouvé' };
  }

  const dedup = deduplicate(ranked);

  // ── TIER 3: DeepSeek picks best among top 5 ───────────────────────────
  const best = await scoreWithAI(villageName, country, dedup.slice(0, 5));

  if (!best) return { found: false, villageName, error: 'Aucun résultat sélectionné' };

  console.log(`[GeoAgent] Done in ${Date.now()-t0}ms — best: "${best.villageName}" [${best.source}]`);

  // Comment generated in background (non-blocking)
  _generateCommentAsync(villageName, country, best.latitude, best.longitude, filters.language || 'fr');

  return {
    ...best,
    found: true,
    alternatives: dedup.slice(1, 5),
    totalSources: ranked.length,
  };
};

// ── Background comment generation (non-blocking) ──────────────────────────
const _commentCache = new Map();
const _generateCommentAsync = (villageName, country, lat, lng, lang) => {
  const key = `comment:${villageName}:${country}`;
  if (_commentCache.has(key)) return;
  _commentCache.set(key, null); // Mark as in-progress
  generateVillageComment(villageName, country, lat, lng, lang)
    .then(comment => _commentCache.set(key, comment))
    .catch(() => _commentCache.delete(key));
};

const getCommentFromCache = (villageName, country) =>
  _commentCache.get(`comment:${villageName}:${country}`) || null;

// ═══════════════════════════════════════════════════════════════════════════
// 💬 VILLAGE COMMENT (Brave Search + DeepSeek)
// ═══════════════════════════════════════════════════════════════════════════

const generateVillageComment = async (villageName, country = '', lat = null, lng = null, lang = 'fr') => {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const braveKey    = process.env.BRAVE_SEARCH_API_KEY;
  const baseUrl     = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  if (!deepseekKey) return null;

  let webContext = '';
  if (braveKey) {
    try {
      const resp = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: { q: `"${villageName}" ${country} village localisation`, count: 3 },
        headers: { Accept: 'application/json', 'X-Subscription-Token': braveKey },
        timeout: 6000,
      });
      const snippets = (resp.data?.web?.results || [])
        .map(r => r.description).filter(Boolean).slice(0, 3);
      if (snippets.length) webContext = `\nContext: ${snippets.join(' | ')}`;
    } catch (e) {
      console.warn('[Comment] Brave error:', e.message);
    }
  }

  try {
    const coordInfo = lat && lng ? ` (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})` : '';
    const langInstr = lang === 'fr' ? 'En français, 1-2 phrases max.' : 'In English, 1-2 sentences max.';
    const prompt = `${langInstr} Describe the place "${villageName}" in ${country || 'Africa'}${coordInfo}: type, admin area, notable info. If unknown, say so briefly.${webContext}\n\nComment:`;

    const resp = await axios.post(`${baseUrl}/v1/chat/completions`, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3,
    }, {
      headers: { Authorization: `Bearer ${deepseekKey}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    return resp.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.warn('[Comment] DeepSeek error:', e.message);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 SUGGESTIONS DE NOMS SIMILAIRES
// ═══════════════════════════════════════════════════════════════════════════

const suggestSimilarVillages = async (villageName, country = '') => {
  try {
    const [nomRes, ovpRes] = await Promise.allSettled([
      searchNominatim(villageName, country, null, null),
      overpassService.searchVillageGlobal(villageName, null),
    ]);
    const all = [
      ...(nomRes.status === 'fulfilled' ? nomRes.value : []),
      ...(ovpRes.status === 'fulfilled' ? ovpRes.value : []),
    ];
    return [...new Set(
      all.map(r => r.villageName).filter(n => n && n.toLowerCase() !== villageName.toLowerCase())
    )].slice(0, 10);
  } catch (e) {
    console.error('[GeoAgent] suggestions error:', e.message);
    return [];
  }
};

module.exports = { geoAgent, suggestSimilarVillages, generateVillageComment, getCommentFromCache };
