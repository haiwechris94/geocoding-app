const fs = require('fs');

const gs = fs.readFileSync('backend/services/geocodingService.js', 'utf8');
const ac = fs.readFileSync('backend/services/apiClients.js', 'utf8');
const ga = fs.readFileSync('backend/services/geoAgent.js', 'utf8');

const checks = [
  ['1a geoAgent filters passed',   gs.includes("geoAgent(villageName, filters.country || filters.countryCode || '', filters)")],
  ['1b country-level guard',       gs.includes('_bestNameSim < 0.35')],
  ['2a Nominatim refCity viewbox', ac.includes('refCity')],
  ['2b GeoNames proximity order',  ac.includes("orderby = 'proximity'")],
  ['2c Photon refCity bias',       ac.includes('prefer refCity')],
  ['3  geoAgent GeoNames radius',  ga.includes('radius: 150')],
  ['3  geoAgent Photon lat bias',  ga.includes('(refLat && refLng) ? { lat: refLat, lon: refLng }')],
];

let allOk = true;
for (const [label, ok] of checks) {
  console.log((ok ? '✅' : '❌') + ' ' + label);
  if (!ok) allOk = false;
}
console.log(allOk ? '\nAll patches verified.' : '\nSome patches are missing — re-running patch script...');
process.exit(allOk ? 0 : 1);
