const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'services', 'geocodingService.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add fuzzyMatchService import after levenshtein import
const importOld = "const levenshtein = require('fast-levenshtein');";
const importNew = "const levenshtein = require('fast-levenshtein');\nconst fuzzyMatchService = require('./fuzzyMatchService');";
if (!content.includes("require('./fuzzyMatchService')")) {
  content = content.replace(importOld, importNew);
  console.log('✓ Added fuzzyMatchService import');
} else {
  console.log('- fuzzyMatchService import already present');
}

// 2. Replace calculateNameSimilarity to use combinedSimilarity
const oldFn = `const calculateNameSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const distance = levenshtein.get(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLength);
};`;

const newFn = `const calculateNameSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Use combined Levenshtein + Double Metaphone phonetic score (Option 4)
  const combined = fuzzyMatchService.combinedSimilarity(s1, s2);

  // Also compute plain Levenshtein as a fallback floor
  const distance = levenshtein.get(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const levenshteinScore = 1 - (distance / maxLength);

  // Return the best of the two scores
  return Math.max(combined, levenshteinScore);
};`;

// Normalize CRLF -> LF for matching, then replace
const contentLF = content.replace(/\r\n/g, '\n');
const oldFnNorm = oldFn.replace(/\r\n/g, '\n');

if (contentLF.includes(oldFnNorm)) {
  const updated = contentLF.replace(oldFnNorm, newFn);
  content = updated;
  console.log('✓ Updated calculateNameSimilarity to use combinedSimilarity');
} else {
  console.log('! calculateNameSimilarity pattern not matched — check manually');
}

// 3. Lower similarity threshold from 0.7 to 0.55
// Look for patterns like: >= 0.7  or  > 0.7  or  threshold: 0.7  or  minScore: 0.7
const thresholdPatterns = [
  { old: '>= 0.7', new: '>= 0.55' },
  { old: '> 0.7',  new: '> 0.55'  },
  { old: 'threshold: 0.7', new: 'threshold: 0.55' },
  { old: 'minScore: 0.7',  new: 'minScore: 0.55'  },
  { old: 'minSimilarity: 0.7', new: 'minSimilarity: 0.55' },
  { old: 'similarity >= 0.7', new: 'similarity >= 0.55' },
  { old: 'score >= 0.7', new: 'score >= 0.55' },
  { old: 'nameScore >= 0.7', new: 'nameScore >= 0.55' },
  { old: 'nameSimilarity >= 0.7', new: 'nameSimilarity >= 0.55' },
];

let thresholdChanged = false;
for (const p of thresholdPatterns) {
  if (content.includes(p.old)) {
    content = content.split(p.old).join(p.new);
    console.log(`✓ Replaced threshold pattern: "${p.old}" -> "${p.new}"`);
    thresholdChanged = true;
  }
}
if (!thresholdChanged) {
  console.log('! No threshold pattern matched — searching for 0.7 occurrences near similarity/score keywords...');
  // Show context around any 0.7 occurrences
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('0.7') && (line.includes('similar') || line.includes('score') || line.includes('threshold') || line.includes('min'))) {
      console.log(`  Line ${i+1}: ${line.trim()}`);
    }
  });
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nDone. File written.');
