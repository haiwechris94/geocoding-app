/**
 * Geocoding Patch - applies all 3 fixes
 * Usage: node _patch_geocoding.js
 */
'use strict';
const fs = require('fs');

function patch(filePath, replacements) {
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [tag, from, to] of replacements) {
    if (src.includes(to.trim ? to.trim() : to)) {
      console.log(`  [${tag}] already applied`);
    } else if (src.includes(from)) {
      src = src.split(from).join(to);
      console.log(`  [${tag}] applied`);
      changed++;
    } else {
      console.warn(`  [${tag}] NOT FOUND — skipped`);
    }
  }
  if (changed > 0) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`  => saved ${filePath}`);
  }
}

// ── geocodingService.js ────────────────────────────────────────────────────
console.log('\n[1] geocodingService.js');
patch('backend/services/geocodingService.js', [
  [
    '1a-geoAgent-filters',
    "const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '');",
    "const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '', filters);"
  ],
  [
    '1b-country-guard',
    '  const bestResult = scoredResults[0];',
    [
      '',
      '  // GUARD: reject country-level / unrelated results',
      '  // Low name similarity means the API returned a country centroid, not the village',
      '  const _bestCandidate = scoredResults[0];',
      '  const _bestExtractedName = extractVillageName(_bestCandidate.formattedAddress);',
      '  const _bestNameSim = calculateNameSimilarity(villageName, _bestExtractedName);',
      '  if (_bestNameSim < 0.35) {',
      "    console.warn('[Geocoding] Low similarity (' + Math.round(_bestNameSim * 100) + '%) for \"' + _bestExtractedName + '\" vs \"' + villageName + '\" - rejecting country-level result');",
      '    if (geocodingSettings.enableFuzzyMatching) {',
      '      return await fuzzyMatchVillage(villageName, filters);',
      '    }',
      '    return {',
      '      villageName,',
      '      found: false,',
      '      confidence: 0,',
      '      message: {',
      "        en: 'Village \"' + villageName + '\" not found. No matching location was identified.',",
      "        fr: 'Village \"' + villageName + '\" non trouve. Aucun lieu correspondant identifie.'",
      '      }',
      '    };',
      '  }',
      '',
      '  const bestResult = scoredResults[0];',
    ].join('\n')
  ]
]);

// ── apiClients.js ──────────────────────────────────────────────────────────
console.log('\n[2] apiClients.js');
patch('backend/services/apiClients.js', [
  [
    '2a-nominatim-refcity',
    '    // Add viewbox for geographic bounds if provided\n    if (filters.bounds) {\n      params.viewbox = `${filters.bounds.west},${filters.bounds.south},${filters.bounds.east},${filters.bounds.north}`;\n      params.bounded = 1;\n    }',
    [
      '    // Add viewbox for geographic bounds if provided',
      '    if (filters.bounds) {',
      '      params.viewbox = `${filters.bounds.west},${filters.bounds.south},${filters.bounds.east},${filters.bounds.north}`;',
      '      params.bounded = 1;',
      '    }',
      '',
      '    // Soft viewbox bias from reference city (+-1.5 deg ~ 150km) if no explicit bounds',
      '    if (!filters.bounds && filters.refCityLat && filters.refCityLng) {',
      '      const rLat = parseFloat(filters.refCityLat);',
      '      const rLng = parseFloat(filters.refCityLng);',
      '      const delta = 1.5;',
      '      params.viewbox = `${rLng - delta},${rLat - delta},${rLng + delta},${rLat + delta}`;',
      '      params.bounded = 0;',
      '    }',
    ].join('\n')
  ],
  [
    '2b-geonames-proximity',
    "    // Add country filter if provided\n    if (filters.countryCode) {\n      params.country = filters.countryCode;\n    }\n\n    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });",
    [
      '    // Add country filter if provided',
      '    if (filters.countryCode) {',
      '      params.country = filters.countryCode;',
      '    }',
      '',
      '    // Bias search around reference city if provided',
      '    if (filters.refCityLat && filters.refCityLng) {',
      '      params.lat = parseFloat(filters.refCityLat);',
      '      params.lng = parseFloat(filters.refCityLng);',
      '      params.radius = 150;',
      "      params.orderby = 'proximity';",
      '    }',
      '',
      '    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });',
    ].join('\n')
  ],
  [
    '2c-photon-refcity',
    '    // Add location bias if provided\n    if (filters.lat && filters.lng) {\n      params.lat = filters.lat;\n      params.lon = filters.lng;\n    }',
    [
      '    // Add location bias - prefer refCity coordinates, fallback to generic lat/lng',
      '    const photonLat = filters.refCityLat || filters.lat;',
      '    const photonLng = filters.refCityLng || filters.lng;',
      '    if (photonLat && photonLng) {',
      '      params.lat = parseFloat(photonLat);',
      '      params.lon = parseFloat(photonLng);',
      '    }',
    ].join('\n')
  ]
]);

// ── geoAgent.js ────────────────────────────────────────────────────────────
console.log('\n[3] geoAgent.js');
patch('backend/services/geoAgent.js', [
  [
    '3a-geonames-proximity',
    "      params: { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },",
    [
      '      params: Object.assign(',
      "        { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },",
      "        (refLat && refLng) ? { lat: refLat, lng: refLng, radius: 150, orderby: 'proximity' } : {}",
      '      ),',
    ].join('\n')
  ],
  [
    '3b-photon-bias',
    "      params: { q: `${villageName}${country ? ', ' + country : ''}`, limit: 3 },",
    [
      '      params: Object.assign(',
      "        { q: `${villageName}${country ? ', ' + country : ''}`, limit: 3 },",
      '        (refLat && refLng) ? { lat: refLat, lon: refLng } : {}',
      '      ),',
    ].join('\n')
  ]
]);

// ── Verification ───────────────────────────────────────────────────────────
console.log('\n=== Verification ===');
const gs = fs.readFileSync('backend/services/geocodingService.js', 'utf8');
const ac = fs.readFileSync('backend/services/apiClients.js', 'utf8');
const ga = fs.readFileSync('backend/services/geoAgent.js', 'utf8');

const checks = [
  ['1a geoAgent filters',    gs.includes("geoAgent(villageName, filters.country || filters.countryCode || '', filters)")],
  ['1b country guard',       gs.includes('_bestNameSim < 0.35')],
  ['2a Nominatim refCity',   ac.includes('Soft viewbox bias from reference city')],
  ['2b GeoNames proximity',  ac.includes("params.orderby = 'proximity'")],
  ['2c Photon refCity',      ac.includes('prefer refCity coordinates')],
  ['3a geoAgent GeoNames',   ga.includes("orderby: 'proximity'")],
  ['3b geoAgent Photon',     ga.includes('(refLat && refLng) ? { lat: refLat, lon: refLng }')],
];

let allOk = true;
for (const [label, ok] of checks) {
  console.log((ok ? 'OK  ' : 'FAIL') + '  ' + label);
  if (!ok) allOk = false;
}
console.log(allOk ? '\nAll patches verified successfully.' : '\nSome patches failed — check above.');
