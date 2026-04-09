const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'backend/services/geocodingService.js');
let content = fs.readFileSync(filePath, 'utf8');

let changed = 0;

// PATCH A — Insérer filtre validResults + guard clause
const A_old = '  const bestResult = scoredResults[0];';
const A_new = [
  '  // FIX 3 \u2014 Filtrer les r\u00e9sultats dont le nom est trop \u00e9loign\u00e9 du village cherch\u00e9.',
  '  // \u00c9vite de retourner les coordonn\u00e9es du pays quand le village est introuvable.',
  '  const validResults = scoredResults.filter(r => {',
  '    const extracted = extractVillageName(r.formattedAddress);',
  '    return calculateNameSimilarity(villageName, extracted) >= 0.25;',
  '  });',
  '',
  '  if (validResults.length === 0) {',
  '    return {',
  '      villageName,',
  '      found: false,',
  '      confidence: 0,',
  "      message: { en: 'Village not found', fr: 'Village non trouv\u00e9' }",
  '    };',
  '  }',
  '',
  '  const bestResult = validResults[0];'
].join('\r\n');

if (content.includes(A_old)) { content = content.replace(A_old, A_new); changed++; process.stdout.write('PATCH A OK\n'); }
else process.stdout.write('PATCH A: not found\n');

// PATCH B — nameSuggestions utilise validResults
const B_old = '  const nameSuggestions = generateNameSuggestions(villageName, results, 5);';
const B_new = '  const nameSuggestions = generateNameSuggestions(villageName, validResults, 5);';
if (content.includes(B_old)) { content = content.replace(B_old, B_new); changed++; process.stdout.write('PATCH B OK\n'); }
else process.stdout.write('PATCH B: not found\n');

// PATCH C — alternativeResults utilise validResults
const C_old = '    alternativeResults: scoredResults.slice(1, 4), // Top 3 alternatives';
const C_new = '    alternativeResults: validResults.slice(1, 4), // Top 3 alternatives';
if (content.includes(C_old)) { content = content.replace(C_old, C_new); changed++; process.stdout.write('PATCH C OK\n'); }
else process.stdout.write('PATCH C: not found\n');

// PATCH D — Seuil fuzzyMatch 0.55 -> 0.45
const D_old = '      if (similarity >= 0.55) { // At least 55% similar (Option 4: lowered threshold)';
const D_new = '      if (similarity >= 0.45) { // FIX 3 \u2014 seuil relev\u00e9 pour \u00e9viter les faux positifs (ex: nom du pays)';
if (content.includes(D_old)) { content = content.replace(D_old, D_new); changed++; process.stdout.write('PATCH D OK\n'); }
else process.stdout.write('PATCH D: not found\n');

// PATCH E — Message simplifié
const E_old = "      en: 'Village not found, even with fuzzy matching',";
const E_new = "      en: 'Village not found',";
if (content.includes(E_old)) { content = content.replace(E_old, E_new); changed++; process.stdout.write('PATCH E(en) OK\n'); }
else process.stdout.write('PATCH E(en): not found\n');

const F_old = "      fr: 'Village non trouv\u00e9, m\u00eame avec correspondance approximative'";
const F_new = "      fr: 'Village non trouv\u00e9'";
if (content.includes(F_old)) { content = content.replace(F_old, F_new); changed++; process.stdout.write('PATCH F(fr) OK\n'); }
else process.stdout.write('PATCH F(fr): not found\n');

fs.writeFileSync(filePath, content, 'utf8');
process.stdout.write('Done. Patches applied: ' + changed + '/6\n');
