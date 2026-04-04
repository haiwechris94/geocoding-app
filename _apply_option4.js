const fs = require('fs');
const file = 'backend/services/geocodingService.js';
let c = fs.readFileSync(file, 'utf8');
const results = [];

// 1. Add fuzzyMatchService import
if (!c.includes("require('./fuzzyMatchService')")) {
  c = c.replace(
    "const levenshtein = require('fast-levenshtein');",
    "const levenshtein = require('fast-levenshtein');\nconst fuzzyMatchService = require('./fuzzyMatchService');"
  );
  results.push('OK: fuzzyMatchService import added');
} else {
  results.push('SKIP: fuzzyMatchService import already present');
}

// 2. Replace calculateNameSimilarity — match regardless of CRLF/LF
// Normalize to LF for matching, then write back
const cLF = c.replace(/\r\n/g, '\n');

const oldFnLF = `const calculateNameSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const distance = levenshtein.get(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLength);
};`;

const newFnLF = `const calculateNameSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Combined score: 60% Levenshtein + 40% Double Metaphone phonetic (Option 4)
  const combined = fuzzyMatchService.combinedSimilarity(s1, s2);

  // Plain Levenshtein as a fallback floor
  const distance = levenshtein.get(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const levenshteinScore = 1 - (distance / maxLength);

  // Return the best of the two scores
  return Math.max(combined, levenshteinScore);
};`;

if (cLF.includes(oldFnLF)) {
  c = cLF.replace(oldFnLF, newFnLF);
  results.push('OK: calculateNameSimilarity updated (LF mode)');
} else {
  results.push('FAIL: calculateNameSimilarity pattern not matched');
  // Debug: show the actual function in file
  const idx = cLF.indexOf('const calculateNameSimilarity');
  if (idx !== -1) {
    results.push('DEBUG actual fn: ' + JSON.stringify(cLF.substring(idx, idx + 300)));
  }
}

// 3. Lower threshold 0.7 -> 0.55
if (c.includes('similarity >= 0.7')) {
  c = c.replace('similarity >= 0.7', 'similarity >= 0.55');
  results.push('OK: threshold lowered to 0.55');
} else {
  results.push('SKIP/FAIL: threshold 0.7 not found (may already be 0.55)');
}

fs.writeFileSync(file, c, 'utf8');
fs.writeFileSync('_apply_option4_result.txt', results.join('\n'), 'utf8');
console.log(results.join('\n'));
