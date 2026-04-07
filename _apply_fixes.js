/**
 * Apply 3 fixes to geoAgent.js and geocodingService.js
 */
const fs = require('fs');

// ─── FIX geoAgent.js ──────────────────────────────────────────────────────
let ga = fs.readFileSync('backend/services/geoAgent.js', 'utf8');

// FIX 1: Replace header comment + imports + similarity function
const oldHeader = /\/\*\*[\s\S]*?\*\/\r?\n\r?\nconst axios = require\('axios'\);\r?\n\r?\n\/\/ ── Import new services ─+\r?\nconst overpassService\s+=\s+require\('\.\/overpassService'\);\r?\nconst wikidataService\s+=\s+require\('\.\/wikidataService'\);\r?\nconst braveSearchService = require\('\.\/braveSearchService'\);\r?\n\r?\n\/\/ ── Levenshtein distance[\s\S]*?const similarity = \(a, b\) => \{[\s\S]*?\};\r?\n/;

const newHeader = `/**
 * GeoAgent Enhanced — Multi-Source Village Geocoder
 * Intègre : Nominatim, GeoNames, OpenCage, Google Maps,
 *            Overpass (OSM), Wikidata, Brave Search
 *
 * FIX 1 — Similarité phonétique : utilise fuzzyMatchService.combinedSimilarity()
 *          (Levenshtein 50% + Double Metaphone 50%) pour gérer les erreurs de
 *          prononciation africaines/françaises (ex: Riyao = Riao, Diakhao = Diakao)
 * FIX 2 — Transmission des filters complets (refCity) depuis geocodingService
 * FIX 3 — Rejet des résultats avec similarité de nom < 25% (évite coordonnées pays)
 */

const axios = require('axios');

// ── Import new services ────────────────────────────────────────────────────
const overpassService    = require('./overpassService');
const wikidataService    = require('./wikidataService');
const braveSearchService = require('./braveSearchService');
// FIX 1 — Similarité phonétique (remplace Levenshtein seul)
const fuzzyMatchService  = require('./fuzzyMatchService');

// ── Combined similarity: Levenshtein (50%) + phonétique Double Metaphone (50%)
// Gère les erreurs phonétiques africaines/françaises (Riyao=Riao, Diakhao=Diakao…)
const similarity = (a, b) => {
  if (!a || !b) return 0;
  return fuzzyMatchService.combinedSimilarity(a, b);
};
`;

ga = ga.replace(oldHeader, newHeader);
if (!ga.includes('fuzzyMatchService')) {
  console.error('FIX 1 FAILED — pattern not matched');
  process.exit(1);
}
console.log('FIX 1 OK — phonetic similarity active');

// FIX 3: Insert name-similarity filter after scored.sort(), before deduplication
const sortLine = /scored\.sort\(\(a, b\) => b\.score - a\.score\);\r?\n/;
const fix3Insert = `scored.sort((a, b) => b.score - a.score);

  // FIX 3 — Rejet des résultats trop éloignés phonétiquement du nom recherché
  // Évite de retourner les coordonnées du pays quand le village n'est pas trouvé
  const MIN_NAME_SIM = 0.25;
  const filtered = scored.filter(cand => {
    const ns = similarity(villageName, cand.villageName || '');
    if (ns < MIN_NAME_SIM) {
      console.log(\`[GeoAgent] Rejeté (nameSim=\${ns.toFixed(2)} < \${MIN_NAME_SIM}): \${cand.villageName} [\${cand.source}]\`);
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    console.warn(\`[GeoAgent] Aucun résultat avec similarité >= \${MIN_NAME_SIM} pour "\${villageName}"\`);
    return { found: false, villageName, error: 'Village non trouvé — aucune correspondance suffisante' };
  }

`;

ga = ga.replace(sortLine, fix3Insert);
if (!ga.includes('MIN_NAME_SIM')) {
  console.error('FIX 3 FAILED — sort line not matched');
  process.exit(1);
}
console.log('FIX 3 OK — name similarity filter added');

// FIX 3b: Use 'filtered' instead of 'scored' in deduplication loop
ga = ga.replace(
  /for \(const cand of scored\)/,
  'for (const cand of filtered)'
);
if (!ga.includes('for (const cand of filtered)')) {
  console.error('FIX 3b FAILED — dedup loop not updated');
  process.exit(1);
}
console.log('FIX 3b OK — dedup loop uses filtered');

fs.writeFileSync('backend/services/geoAgent.js', ga, 'utf8');
console.log('geoAgent.js saved');

// ─── FIX geocodingService.js ──────────────────────────────────────────────
let gs = fs.readFileSync('backend/services/geocodingService.js', 'utf8');

// FIX 2: Pass full filters to geoAgent instead of just country
const oldCall = /const agentResult = await geoAgent\(villageName, filters\.country \|\| filters\.countryCode \|\| ''\);/;
const newCall = `// FIX 2 — Transmission des filters complets (refCity, pays) à geoAgent
    const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '', filters);`;

gs = gs.replace(oldCall, newCall);
if (!gs.includes('FIX 2')) {
  console.error('FIX 2 FAILED — geoAgent call not matched');
  process.exit(1);
}
console.log('FIX 2 OK — filters passed to geoAgent');

fs.writeFileSync('backend/services/geocodingService.js', gs, 'utf8');
console.log('geocodingService.js saved');

console.log('\n✅ All 3 fixes applied successfully');
