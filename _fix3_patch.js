/**
 * FIX 3 patch — geocodingService.js
 * Applique 3 corrections pour éviter de retourner les coordonnées du pays
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/services/geocodingService.js');
let content = fs.readFileSync(filePath, 'utf8');

// ── PATCH A ──────────────────────────────────────────────────────────────────
// Après le tri par score, filtrer les résultats dont le nom est trop éloigné
// du village cherché, puis retourner "Village non trouvé" si aucun résultat valide.
const patchA_search = `  const bestResult = scoredResults[0];`;
const patchA_replace = `  // FIX 3 — Filtrer les résultats dont le nom est trop éloigné du village cherché.
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

  const bestResult = validResults[0];`;

if (content.includes(patchA_search)) {
  content = content.replace(patchA_search, patchA_replace);
  console.log('✅ PATCH A appliqué : filtre validResults + guard clause');
} else {
  console.log('⚠️  PATCH A : cible non trouvée (déjà appliqué ?)');
}

// ── PATCH B ──────────────────────────────────────────────────────────────────
// Remplacer scoredResults par validResults dans generateNameSuggestions
const patchB_search = `  const nameSuggestions = generateNameSuggestions(villageName, results, 5);`;
const patchB_replace = `  const nameSuggestions = generateNameSuggestions(villageName, validResults, 5);`;

if (content.includes(patchB_search)) {
  content = content.replace(patchB_search, patchB_replace);
  console.log('✅ PATCH B appliqué : nameSuggestions utilise validResults');
} else {
  console.log('⚠️  PATCH B : cible non trouvée (déjà appliqué ?)');
}

// ── PATCH C ──────────────────────────────────────────────────────────────────
// Remplacer scoredResults.slice par validResults.slice dans alternativeResults
const patchC_search = `    alternativeResults: scoredResults.slice(1, 4), // Top 3 alternatives`;
const patchC_replace = `    alternativeResults: validResults.slice(1, 4), // Top 3 alternatives`;

if (content.includes(patchC_search)) {
  content = content.replace(patchC_search, patchC_replace);
  console.log('✅ PATCH C appliqué : alternativeResults utilise validResults');
} else {
  console.log('⚠️  PATCH C : cible non trouvée (déjà appliqué ?)');
}

// ── PATCH D ──────────────────────────────────────────────────────────────────
// Relever le seuil de fuzzyMatchVillage de 0.55 à 0.45
const patchD_search = `      if (similarity >= 0.55) { // At least 55% similar (Option 4: lowered threshold)`;
const patchD_replace = `      if (similarity >= 0.45) { // FIX 3 — seuil relevé pour éviter les faux positifs (ex: nom du pays)`;

if (content.includes(patchD_search)) {
  content = content.replace(patchD_search, patchD_replace);
  console.log('✅ PATCH D appliqué : seuil fuzzyMatch 0.55 → 0.45');
} else {
  console.log('⚠️  PATCH D : cible non trouvée (déjà appliqué ?)');
}

// ── PATCH E ──────────────────────────────────────────────────────────────────
// Simplifier le message "Village non trouvé" dans fuzzyMatchVillage
const patchE_search = `      en: 'Village not found, even with fuzzy matching',
      fr: 'Village non trouvé, même avec correspondance approximative'`;
const patchE_replace = `      en: 'Village not found',
      fr: 'Village non trouvé'`;

if (content.includes(patchE_search)) {
  content = content.replace(patchE_search, patchE_replace);
  console.log('✅ PATCH E appliqué : message simplifié "Village non trouvé"');
} else {
  console.log('⚠️  PATCH E : cible non trouvée (déjà appliqué ?)');
}

// ── ÉCRITURE ─────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Fichier geocodingService.js mis à jour avec succès.');
