/**
 * GeoAgent — Multi-Source Geocoding Agent + Similar Name Suggestions
 * Place this file at: /backend/services/geoAgent.js
 */

const axios = require("axios");

// ─────────────────────────────────────────────
// SOURCE 1 — OpenCage
// ─────────────────────────────────────────────
async function queryOpenCage(query, limit = 1) {
  try {
    const res = await axios.get("https://api.opencagedata.com/geocode/v1/json", {
      params: {
        key: process.env.OPENCAGE_API_KEY,
        q: query,
        limit,
        no_annotations: 1,
      },
      timeout: 6000,
    });

    if (res.data.results && res.data.results.length > 0) {
      return res.data.results.map((r) => ({
        source: "OpenCage",
        lat: r.geometry.lat,
        lng: r.geometry.lng,
        confidence: r.confidence / 10,
        formatted: r.formatted,
      }));
    }
  } catch (e) {
    console.warn("[GeoAgent] OpenCage error:", e.message);
  }
  return [];
}

// ─────────────────────────────────────────────
// SOURCE 2 — Nominatim (OpenStreetMap)
// ─────────────────────────────────────────────
async function queryNominatim(query, limit = 1) {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "json",
        limit,
        addressdetails: 1,
      },
      headers: {
        "User-Agent": `VillagePoint-GeoAgent/1.0 (${process.env.NOMINATIM_EMAIL})`,
      },
      timeout: 6000,
    });

    if (res.data && res.data.length > 0) {
      return res.data.map((r) => ({
        source: "Nominatim (OSM)",
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        confidence: Math.min(parseFloat(r.importance) || 0.5, 1),
        formatted: r.display_name,
      }));
    }
  } catch (e) {
    console.warn("[GeoAgent] Nominatim error:", e.message);
  }
  return [];
}

// ─────────────────────────────────────────────
// SOURCE 3 — GeoNames
// ─────────────────────────────────────────────
async function queryGeoNames(query, limit = 1) {
  try {
    const username = process.env.GEONAMES_USERNAME;
    if (!username || username === "your_geonames_username_here") return [];

    const res = await axios.get("http://api.geonames.org/searchJSON", {
      params: {
        q: query,
        maxRows: limit,
        username,
        type: "json",
      },
      timeout: 6000,
    });

    if (res.data.geonames && res.data.geonames.length > 0) {
      return res.data.geonames.map((r) => ({
        source: "GeoNames",
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        confidence: 0.6,
        formatted: [r.name, r.adminName1, r.countryName].filter(Boolean).join(", "),
        name: r.name,
      }));
    }
  } catch (e) {
    console.warn("[GeoAgent] GeoNames error:", e.message);
  }
  return [];
}

// ─────────────────────────────────────────────
// SCORING — Score de fiabilité global
// ─────────────────────────────────────────────
function computeReliabilityScore(results) {
  if (results.length === 0) return 0;
  if (results.length === 1) return results[0].confidence * 0.7;

  const lats = results.map((r) => r.lat);
  const lngs = results.map((r) => r.lng);
  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);

  // Bonus si les sources sont géographiquement cohérentes (< ~11km)
  const coherenceBonus = latSpread < 0.1 && lngSpread < 0.1 ? 0.2 : 0;
  const avgConf = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const sourceBonus = results.length >= 2 ? 0.1 : 0;

  return Math.min(avgConf + coherenceBonus + sourceBonus, 1);
}

// ─────────────────────────────────────────────
// AGENT PRINCIPAL — Géocodage
// ─────────────────────────────────────────────
async function geoAgent(village, country) {
  const query = `${village}, ${country}`;
  console.log(`[GeoAgent] Geocoding: "${query}"`);

  const [opencageRes, nominatimRes, geonamesRes] = await Promise.all([
    queryOpenCage(query, 1),
    queryNominatim(query, 1),
    queryGeoNames(query, 1),
  ]);

  const validResults = [...opencageRes, ...nominatimRes, ...geonamesRes].filter(Boolean);

  if (validResults.length === 0) {
    return {
      query,
      success: false,
      message: {
        en: "No coordinates found for this location.",
        fr: "Aucune coordonnée trouvée pour cet emplacement.",
      },
    };
  }

  const sorted = validResults.sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];
  const reliabilityScore = computeReliabilityScore(validResults);
  const reliabilityLabel =
    reliabilityScore >= 0.8 ? "High" : reliabilityScore >= 0.5 ? "Medium" : "Low";

  console.log(`[GeoAgent] Found ${validResults.length} result(s). Best: ${best.source}`);

  return {
    query,
    success: true,
    best: {
      lat: best.lat,
      lng: best.lng,
      source: best.source,
      formatted: best.formatted,
      confidence: parseFloat(best.confidence.toFixed(2)),
    },
    reliability: {
      score: parseFloat(reliabilityScore.toFixed(2)),
      label: reliabilityLabel,
      sourcesFound: validResults.length,
    },
    alternatives: sorted.map((r) => ({
      source: r.source,
      lat: r.lat,
      lng: r.lng,
      confidence: parseFloat(r.confidence.toFixed(2)),
      formatted: r.formatted,
    })),
  };
}

// ─────────────────────────────────────────────
// SUGGESTIONS — Noms de villages similaires
// ─────────────────────────────────────────────
async function suggestSimilarVillages(village, country) {
  const query = `${village}, ${country}`;
  console.log(`[GeoAgent] Suggesting similar names for: "${query}"`);

  const [opencageRes, nominatimRes, geonamesRes] = await Promise.all([
    queryOpenCage(query, 5),
    queryNominatim(query, 5),
    queryGeoNames(village, 5), // GeoNames : recherche sur le nom seul pour plus de variété
  ]);

  const all = [...opencageRes, ...nominatimRes, ...geonamesRes];

  if (all.length === 0) {
    return {
      query,
      success: false,
      suggestions: [],
      message: {
        en: "No similar villages found.",
        fr: "Aucun village similaire trouvé.",
      },
    };
  }

  // Extraire le nom court depuis le formatted (avant la première virgule)
  const extractName = (formatted) => {
    if (!formatted) return "";
    return formatted.split(",")[0].trim();
  };

  // Dédupliquer par nom court (insensible à la casse)
  const seen = new Set();
  const suggestions = [];

  for (const r of all) {
    const name = extractName(r.formatted);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      name,
      formatted: r.formatted,
      lat: r.lat,
      lng: r.lng,
      source: r.source,
      confidence: parseFloat(r.confidence.toFixed(2)),
    });
  }

  // Trier : priorité aux noms commençant par les mêmes lettres que la saisie
  const inputLower = village.toLowerCase();
  suggestions.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(inputLower.slice(0, 3)) ? 1 : 0;
    const bStarts = b.name.toLowerCase().startsWith(inputLower.slice(0, 3)) ? 1 : 0;
    if (bStarts !== aStarts) return bStarts - aStarts;
    return b.confidence - a.confidence;
  });

  return {
    query,
    success: true,
    inputVillage: village,
    country,
    suggestions: suggestions.slice(0, 8), // Max 8 propositions
  };
}

module.exports = { geoAgent, suggestSimilarVillages };
