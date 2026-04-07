const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/services/geocodingService.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldPattern = "geoAgent(villageName, filters.country || filters.countryCode || '')";
const newPattern = "geoAgent(villageName, filters.country || filters.countryCode || '', filters)";

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ FIX 2 applied: filters now passed to geoAgent');
} else if (content.includes(newPattern)) {
  console.log('✅ FIX 2 already applied — no change needed');
} else {
  // Show what's actually on the line with geoAgent call
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.includes('geoAgent(villageName'));
  if (idx !== -1) {
    console.log('Line ' + (idx+1) + ':', JSON.stringify(lines[idx]));
  } else {
    console.log('❌ Could not find geoAgent(villageName call');
  }
}
