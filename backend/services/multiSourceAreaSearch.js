const axios = require('axios');
const { apiConfig } = require('../config/apiConfig');

// Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Levenshtein similarity 0-1
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return 1 - dp[m][n] / Math.max(m, n);
}

async function searchNominatim(villageName, center, radiusKm) {
  try {
    const viewbox = [
      center.lng - radiusKm/111, center.lat - radiusKm/111,
      center.lng + radiusKm/111, center.lat + radiusKm/111
    ].join(',');
    const url = `https://nominatim.openstreetmap.org/search`;
    const params = {
      q: villageName,
      format: 'json',
      limit: 20,
      addressdetails: 1,
      extratags: 1,
      viewbox,
      bounded: 1
    };
    const resp = await axios.get(url, { params, headers: { 'User-Agent': 'GeocodingApp/1.0' }, timeout: 8000 });
    const results = (resp.data || []).map(r => ({
      name: r.display_name?.split(',')[0] || villageName,
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type,
      importance: r.importance,
      source: 'Nominatim (OSM)',
      sourceKey: 'nominatim',
      raw: r
    })).filter(r => {
      const dist = haversineDistance(center.lat, center.lng, r.lat, r.lng);
      r.distance = Math.round(dist * 10) / 10;
      r.similarity = nameSimilarity(villageName, r.name);
      return dist <= radiusKm;
    }).sort((a, b) => b.similarity - a.similarity);
    return { source: 'Nominatim (OSM)', sourceKey: 'nominatim', results, error: null };
  } catch (e) {
    return { source: 'Nominatim (OSM)', sourceKey: 'nominatim', results: [], error: e.message };
  }
}

async function searchGeoNames(villageName, center, radiusKm) {
  try {
    const username = apiConfig.geoNames?.username || process.env.GEONAMES_USERNAME || 'Chris05';
    const url = `http://api.geonames.org/searchJSON`;
    const params = {
      q: villageName,
      maxRows: 20,
      username,
      lat: center.lat,
      lng: center.lng,
      radius: radiusKm,
      style: 'FULL'
    };
    const resp = await axios.get(url, { params, timeout: 8000 });
    const geonames = resp.data?.geonames || [];
    const results = geonames.map(r => ({
      name: r.name,
      displayName: `${r.name}, ${r.adminName1 || ''}, ${r.countryName || ''}`.replace(/, ,/g, ',').trim(),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      type: r.fclName || r.fcl,
      population: r.population,
      source: 'GeoNames',
      sourceKey: 'geonames',
      raw: r
    })).filter(r => {
      const dist = haversineDistance(center.lat, center.lng, r.lat, r.lng);
      r.distance = Math.round(dist * 10) / 10;
      r.similarity = nameSimilarity(villageName, r.name);
      return dist <= radiusKm;
    }).sort((a, b) => b.similarity - a.similarity);
    return { source: 'GeoNames', sourceKey: 'geonames', results, error: null };
  } catch (e) {
    return { source: 'GeoNames', sourceKey: 'geonames', results: [], error: e.message };
  }
}

async function searchOpenCage(villageName, center, radiusKm) {
  try {
    const key = apiConfig.openCage?.apiKey || process.env.OPENCAGE_API_KEY;
    if (!key) return { source: 'OpenCage', sourceKey: 'opencage', results: [], error: 'No API key' };
    const bounds = `${center.lng - radiusKm/111},${center.lat - radiusKm/111},${center.lng + radiusKm/111},${center.lat + radiusKm/111}`;
    const url = `https://api.opencagedata.com/geocode/v1/json`;
    const params = { q: villageName, key, bounds, limit: 20, no_annotations: 0 };
    const resp = await axios.get(url, { params, timeout: 8000 });
    const results = (resp.data?.results || []).map(r => ({
      name: r.components?.village || r.components?.town || r.components?.city || r.components?.county || villageName,
      displayName: r.formatted,
      lat: r.geometry.lat,
      lng: r.geometry.lng,
      type: r.components?._type,
      confidence: r.confidence,
      source: 'OpenCage',
      sourceKey: 'opencage',
      raw: r
    })).filter(r => {
      const dist = haversineDistance(center.lat, center.lng, r.lat, r.lng);
      r.distance = Math.round(dist * 10) / 10;
      r.similarity = nameSimilarity(villageName, r.name);
      return dist <= radiusKm;
    }).sort((a, b) => b.similarity - a.similarity);
    return { source: 'OpenCage', sourceKey: 'opencage', results, error: null };
  } catch (e) {
    return { source: 'OpenCage', sourceKey: 'opencage', results: [], error: e.message };
  }
}

async function searchGoogleMaps(villageName, center, radiusKm) {
  try {
    const key = apiConfig.googleMaps?.apiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return { source: 'Google Maps', sourceKey: 'google', results: [], error: 'No API key' };
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    const params = {
      query: villageName,
      location: `${center.lat},${center.lng}`,
      radius: radiusKm * 1000,
      key
    };
    const resp = await axios.get(url, { params, timeout: 8000 });
    const results = (resp.data?.results || []).map(r => ({
      name: r.name,
      displayName: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      type: r.types?.[0],
      rating: r.rating,
      source: 'Google Maps',
      sourceKey: 'google',
      raw: r
    })).filter(r => {
      const dist = haversineDistance(center.lat, center.lng, r.lat, r.lng);
      r.distance = Math.round(dist * 10) / 10;
      r.similarity = nameSimilarity(villageName, r.name);
      return dist <= radiusKm;
    }).sort((a, b) => b.similarity - a.similarity);
    return { source: 'Google Maps', sourceKey: 'google', results, error: null };
  } catch (e) {
    return { source: 'Google Maps', sourceKey: 'google', results: [], error: e.message };
  }
}

async function searchPhoton(villageName, center, radiusKm) {
  try {
    const url = `https://photon.komoot.io/api/`;
    const params = {
      q: villageName,
      lat: center.lat,
      lon: center.lng,
      limit: 20
    };
    const resp = await axios.get(url, { params, timeout: 8000 });
    const features = resp.data?.features || [];
    const results = features.map(f => ({
      name: f.properties?.name || villageName,
      displayName: [f.properties?.name, f.properties?.city, f.properties?.state, f.properties?.country].filter(Boolean).join(', '),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      type: f.properties?.type || f.properties?.osm_value,
      source: 'Photon (Komoot)',
      sourceKey: 'photon',
      raw: f
    })).filter(r => {
      const dist = haversineDistance(center.lat, center.lng, r.lat, r.lng);
      r.distance = Math.round(dist * 10) / 10;
      r.similarity = nameSimilarity(villageName, r.name);
      return dist <= radiusKm;
    }).sort((a, b) => b.similarity - a.similarity);
    return { source: 'Photon (Komoot)', sourceKey: 'photon', results, error: null };
  } catch (e) {
    return { source: 'Photon (Komoot)', sourceKey: 'photon', results: [], error: e.message };
  }
}

async function multiSourceAreaSearch(villageName, center, radiusKm) {
  const searches = await Promise.allSettled([
    searchNominatim(villageName, center, radiusKm),
    searchGeoNames(villageName, center, radiusKm),
    searchOpenCage(villageName, center, radiusKm),
    searchGoogleMaps(villageName, center, radiusKm),
    searchPhoton(villageName, center, radiusKm)
  ]);

  const sourceResults = searches.map(s => s.status === 'fulfilled' ? s.value : { source: 'Unknown', results: [], error: s.reason?.message });

  // Aggregate all unique results for AI analysis
  const allResults = sourceResults.flatMap(s => s.results.slice(0, 5).map(r => ({ ...r, sourceName: s.source })));

  // Find similar names across all sources
  const allNames = [...new Set(allResults.map(r => r.name))];
  const similarNames = allNames.filter(n => {
    const sim = nameSimilarity(villageName, n);
    return sim > 0.3 && sim < 1;
  }).sort((a, b) => nameSimilarity(villageName, b) - nameSimilarity(villageName, a)).slice(0, 10);

  return {
    villageName,
    center,
    radiusKm,
    sourceResults,
    similarNames,
    totalResults: allResults.length,
    searchedAt: new Date().toISOString()
  };
}

module.exports = { multiSourceAreaSearch, haversineDistance, nameSimilarity };
