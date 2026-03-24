const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/pages/AdvancedSearch.js');
let content = fs.readFileSync(file, 'utf8');

// Replace the fetch block with searchAreaAPI call
const fetchBlock = `      const response = await fetch('/api/geocoding/search-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          villageName: villageName.trim(),
          center: { lat: center.lat, lng: center.lng },
          radius: parseFloat(radius),
          filters
        })
      });
      const result = await response.json();`;

const apiBlock = `      const result = await searchAreaAPI.searchArea(
        { lat: center.lat, lng: center.lng },
        parseFloat(radius),
        filters?.countryCode || null
      );`;

if (content.includes(fetchBlock)) {
  content = content.replace(fetchBlock, apiBlock);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCCESS: fetch replaced with searchAreaAPI.searchArea');
} else {
  console.log('FAILED: fetch block not found in file');
  // Debug: show what's around line 133
  const lines = content.split('\n');
  console.log('Lines 130-145:');
  lines.slice(129, 145).forEach((l, i) => console.log(`${130+i}: ${JSON.stringify(l)}`));
}
