/**
 * Script to apply Option 4 (Double Metaphone + Levenshtein) changes
 * to geocodingService.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'services', 'geocodingService.js');
let content = fs.readFileSync(filePath, 'utf8');

// ── 1. Add fuzzyMatchService import ──────────────────────────────────────────
const importMarker = "const levenshtein = require('fast-levenshtein');";
if (!content.includes("require('./fuzzyMatchService')")) {
  content = content.replace(
    importMarker,
    importMarker + "\nconst fuzzyMatchService = require('./fuzzyMatchService');"
  );
  console.log('[1] fuzzyMatchService import added');
} else {
  console.log('[1] fuzzyMatchService import already present — skipped');
}

// ── 2. Replace calculateNameSimilarity with combined score ───────────────────
const oldFn = /const calculateNameSimilarity = \(str1, str2\) => \{[\s\S]*?return 1 - \(distance \/ maxLength\);\r?\n\};/;
const newFn = `const calculateNameSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const distance = levenshtein.get(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const levenshteinScore = 1 - (distance / maxLength);

  // Option 4: combine Levenshtein (60%) with Double Metaphone phonetic score (40%)
  const phoneticScore = fuzzyMatchService.phoneticSimilarity(str1, str2);

  return (levenshteinScore * 0.6) + (phoneticScore * 0.4);
};`;

if (oldFn.test(content)) {
  content = content.replace(oldFn, newFn);
  console.log('[2] calculateNameSimilarity updated with combined score');
} else {
  console.log('[2] calculateNameSimilarity pattern not matched — skipped');
}

// ── 3. Lower similarity threshold from 0.7 to 0.55 ──────────────────────────
const oldThreshold = 'if (similarity >= 0.7) { // At least 70% similar';
const newThreshold = 'if (similarity >= 0.55) { // At least 55% similar (combined phonetic+levenshtein score)';

if (content.includes(oldThreshold)) {
  content = content.replace(oldThreshold, newThreshold);
  console.log('[3] Similarity threshold lowered to 0.55');
} else if (content.includes(newThreshold)) {
  console.log('[3] Threshold already at 0.55 — skipped');
} else {
  console.log('[3] Threshold pattern not found — skipped');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nAll changes applied to geocodingService.js');
