/**
 * Patch script for geocoding fixes
 * Run: node _patch_fixes.js
 */
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// 1. geocodingService.js
// ─────────────────────────────────────────────────────────────────────────────
const gsPath = path.join(__dirname, 'backend/services/geocodingService.js');
let gs = fs.readFileSync(gsPath, 'utf8');

// Fix 1a: pass filters to geoAgent
const oldGeoAgent = "const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '');";
const newGeoAgent = "const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '', filters);";
if (gs.includes(oldGeoAgent)) {
  gs = gs.replace(oldGeoAgent, newGeoAgent);
  console.log('[geocodingService] Fix 1a applied: filters passed to geoAgent');
} else if (gs.includes(newGeoAgent)) {
  console.log('[geocodingService] Fix 1a already applied');
} else {
  console.warn('[geocodingService] Fix 1a: target string not found!');
}

// Fix 1b: country-level guard before bestResult assignment
const guardMarker = '  const bestResult = scoredResults[0];';
const guardCode = `
  // ── GUARD: reject country-level / unrelated results ──────────────────────
  // If the best result has very low name similarity the API returned a country
  // centroid instead of the actual village — reject it and return not-found.
  const _bestCandidate = scoredResults[0];
  const _bestExtractedName = extractVillageName(_bestCandidate.formattedAddress);
  const _bestNameSim = calculateNameSimilarity(villageName, _bestExtractedName);

  if (_bestNameSim < 0.35) {
    console.warn(
      '[Geocoding] Best result "' + _bestExtractedName + '" has low name similarity (' +
      Math.round(_bestNameSim * 100) + '%) with "' + villageName + '" — rejecting as country-level result'
    );
    if (geocodingSettings.enableFuzzyMatching) {
      return await fuzzyMatchVillage(villageName, filters);
    }
    return {
      villageName,
      found: false,
      confidence: 0,
      message: {
        en: 'Village "' + villageName + '" not found. No matching location was identified.',
        fr: 'Village "' + villageName + '" non trouvé. Aucun lieu correspondant n\'a été identifié.'
      }
    };
  }

  const bestResult = scoredResults[0];`;

if (gs.includes('_bestNameSim < 0.35')) {
  console.log('[geocodingService] Fix 1b already applied');
} else if (gs.includes(guardMarker)) {
  gs = gs.replace(guardMarker, guardCode);
  console.log('[geocodingService] Fix 1b applied: country-level guard added');
} else {
  console.warn('[geocodingService] Fix 1b: marker not found!');
}

fs.writeFileSync(gsPath, gs, 'utf8');
console.log('[geocodingService] Saved.');

// ─────────────────────────────────────────────────────────────────────────────
// 2. apiClients.js — add refCity bias to Nominatim, GeoNames, Photon
// ─────────────────────────────────────────────────────────────────────────────
const acPath = path.join(__dirname, 'backend/services/apiClients.js');
let ac = fs.readFileSync(acPath, 'utf8');

// --- Nominatim: add viewbox from refCityLat/refCityLng if no explicit bounds ---
const nominatimOld = `    // Add viewbox for geographic bounds if provided
    if (filters.bounds) {
      params.viewbox = \`\${filters.bounds.west},\${filters.bounds.south},\${filters.bounds.east},\${filters.bounds.north}\`;
      params.bounded = 1;
    }`;

const nominatimNew = `    // Add viewbox for geographic bounds if provided
    if (filters.bounds) {
      params.viewbox = \`\${filters.bounds.west},\${filters.bounds.south},\${filters.bounds.east},\${filters.bounds.north}\`;
      params.bounded = 1;
    }

    // Add viewbox bias from reference city (±1.5° ≈ ~150km) if no explicit bounds
    if (!filters.bounds && filters.refCityLat && filters.refCityLng) {
      const rLat = parseFloat(filters.refCityLat);
      const rLng = parseFloat(filters.refCityLng);
      const delta = 1.5;
      params.viewbox = \`\${rLng - delta},\${rLat - delta},\${rLng + delta},\${rLat + delta}\`;
      params.bounded = 0; // soft bias, not hard constraint
    }`;

if (ac.includes('// Add viewbox bias from reference city')) {
  console.log('[apiClients] Nominatim refCity bias already applied');
} else if (ac.includes(nominatimOld)) {
  ac = ac.replace(nominatimOld, nominatimNew);
  console.log('[apiClients] Nominatim refCity bias applied');
} else {
  console.warn('[apiClients] Nominatim: target block not found!');
}

// --- GeoNames: add proximity search when refCity is set ---
const geonamesOld = `    // Add country filter if provided
    if (filters.countryCode) {
      params.country = filters.countryCode;
    }

    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });`;

const geonamesNew = `    // Add country filter if provided
    if (filters.countryCode) {
      params.country = filters.countryCode;
    }

    // Bias search around reference city if provided
    if (filters.refCityLat && filters.refCityLng) {
      params.lat = parseFloat(filters.refCityLat);
      params.lng = parseFloat(filters.refCityLng);
      params.radius = 150; // km — prioritise results within 150km of ref city
      params.orderby = 'proximity';
    }

    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });`;

if (ac.includes('params.orderby = \'proximity\'')) {
  console.log('[apiClients] GeoNames refCity bias already applied');
} else if (ac.includes(geonamesOld)) {
  ac = ac.replace(geonamesOld, geonamesNew);
  console.log('[apiClients] GeoNames refCity bias applied');
} else {
  console.warn('[apiClients] GeoNames: target block not found!');
}

// --- Photon: use refCityLat/refCityLng as location bias ---
const photonOld = `    // Add location bias if provided
    if (filters.lat && filters.lng) {
      params.lat = filters.lat;
      params.lon = filters.lng;
    }`;

const photonNew = `    // Add location bias — prefer refCity coordinates, fallback to generic lat/lng
    const photonLat = filters.refCityLat || filters.lat;
    const photonLng = filters.refCityLng || filters.lng;
    if (photonLat && photonLng) {
      params.lat = parseFloat(photonLat);
      params.lon = parseFloat(photonLng);
    }`;

if (ac.includes('prefer refCity coordinates, fallback to generic lat/lng')) {
  console.log('[apiClients] Photon refCity bias already applied');
} else if (ac.includes(photonOld)) {
  ac = ac.replace(photonOld, photonNew);
  console.log('[apiClients] Photon refCity bias applied');
} else {
  console.warn('[apiClients] Photon: target block not found!');
}

fs.writeFileSync(acPath, ac, 'utf8');
console.log('[apiClients] Saved.');

// ─────────────────────────────────────────────────────────────────────────────
// 3. geoAgent.js — also pass refCity to Nominatim/GeoNames/Photon sub-calls
// ─────────────────────────────────────────────────────────────────────────────
const gaPath = path.join(__dirname, 'backend/services/geoAgent.js');
let ga = fs.readFileSync(gaPath, 'utf8');

// Nominatim in geoAgent: add viewbox param
const gaNominatimOld = `      params: { q: \`\${villageName}\${country ? ', ' + country : ''}\`, format: 'json', limit: 3, addressdetails: 1 },`;
const gaNominatimNew = `      params: { q: \`\${villageName}\${country ? ', ' + country : ''}\`, format: 'json', limit: 3, addressdetails: 1 },`;
// Already fine — Nominatim in geoAgent uses locationQuery which includes refCityName

// GeoNames in geoAgent: add proximity params
const gaGeoNamesOld = `      params: { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },`;
const gaGeoNamesNew = `      params: Object.assign(
        { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },
        (refLat && refLng) ? { lat: refLat, lng: refLng, radius: 150, orderby: 'proximity' } : {}
      ),`;

if (ga.includes('radius: 150, orderby:')) {
  console.log('[geoAgent] GeoNames proximity already applied');
} else if (ga.includes(gaGeoNamesOld)) {
  ga = ga.replace(gaGeoNamesOld, gaGeoNamesNew);
  console.log('[geoAgent] GeoNames proximity applied');
} else {
  console.warn('[geoAgent] GeoNames: target line not found!');
}

// Photon in geoAgent: add lat/lon bias
const gaPhotonOld = `      params: { q: \`\${villageName}\${country ? ', ' + country : ''}\`, limit: 3 },`;
const gaPhotonNew = `      params: Object.assign(
        { q: \`\${villageName}\${country ? ', ' + country : ''}\`, limit: 3 },
        (refLat && refLng) ? { lat: refLat, lon: refLng } : {}
      ),`;

if (ga.includes('(refLat && refLng) ? { lat: refLat, lon: refLng }')) {
  console.log('[geoAgent] Photon bias already applied');
} else if (ga.includes(gaPhotonOld)) {
  ga = ga.replace(gaPhotonOld, gaPhotonNew);
  console.log('[geoAgent] Photon bias applied');
} else {
  console.warn('[geoAgent] Photon: target line not found!');
}

fs.writeFileSync(gaPath, ga, 'utf8');
console.log('[geoAgent] Saved.');

console.log('\n✅ All patches applied successfully.');
