# Patch script for geocoding fixes
# Run: powershell -File _do_patches.ps1

Set-Location $PSScriptRoot

# ─────────────────────────────────────────────────────────────────────────────
# 1. geocodingService.js
# ─────────────────────────────────────────────────────────────────────────────
$gsPath = "backend\services\geocodingService.js"
$gs = [System.IO.File]::ReadAllText($gsPath)

# Fix 1a: pass filters to geoAgent
$old1a = "const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '');"
$new1a = "const agentResult = await geoAgent(villageName, filters.country || filters.countryCode || '', filters);"
if ($gs.Contains($old1a)) {
    $gs = $gs.Replace($old1a, $new1a)
    Write-Host "[geocodingService] 1a OK: filters passed to geoAgent"
} elseif ($gs.Contains($new1a)) {
    Write-Host "[geocodingService] 1a already applied"
} else {
    Write-Host "[geocodingService] 1a NOT FOUND - check manually"
}

# Fix 1b: country-level guard
$guard1b = @"

  // GUARD: reject country-level results with low name similarity
  // If best result name similarity < 35%, the API returned a country centroid
  const _bestCandidate = scoredResults[0];
  const _bestExtractedName = extractVillageName(_bestCandidate.formattedAddress);
  const _bestNameSim = calculateNameSimilarity(villageName, _bestExtractedName);
  if (_bestNameSim < 0.35) {
    console.warn('[Geocoding] Low similarity (' + Math.round(_bestNameSim * 100) + '%) for "' + _bestExtractedName + '" vs "' + villageName + '" - rejecting country-level result');
    if (geocodingSettings.enableFuzzyMatching) {
      return await fuzzyMatchVillage(villageName, filters);
    }
    return {
      villageName,
      found: false,
      confidence: 0,
      message: {
        en: 'Village "' + villageName + '" not found. No matching location was identified.',
        fr: 'Village "' + villageName + '" non trouve. Aucun lieu correspondant identifie.'
      }
    };
  }

  const bestResult = scoredResults[0];
"@

if ($gs.Contains("_bestNameSim < 0.35")) {
    Write-Host "[geocodingService] 1b already applied"
} elseif ($gs.Contains("  const bestResult = scoredResults[0];")) {
    $gs = $gs.Replace("  const bestResult = scoredResults[0];", $guard1b)
    Write-Host "[geocodingService] 1b OK: country-level guard added"
} else {
    Write-Host "[geocodingService] 1b NOT FOUND - check manually"
}

[System.IO.File]::WriteAllText($gsPath, $gs)
Write-Host "[geocodingService] Saved."

# ─────────────────────────────────────────────────────────────────────────────
# 2. apiClients.js — add refCity bias to Nominatim, GeoNames, Photon
# ─────────────────────────────────────────────────────────────────────────────
$acPath = "backend\services\apiClients.js"
$ac = [System.IO.File]::ReadAllText($acPath)

# Nominatim: add viewbox from refCityLat/refCityLng
$nomOld = "    // Add viewbox for geographic bounds if provided
    if (filters.bounds) {
      params.viewbox = ``\${filters.bounds.west},\${filters.bounds.south},\${filters.bounds.east},\${filters.bounds.north}``;
      params.bounded = 1;
    }"

$nomNew = "    // Add viewbox for geographic bounds if provided
    if (filters.bounds) {
      params.viewbox = ``\${filters.bounds.west},\${filters.bounds.south},\${filters.bounds.east},\${filters.bounds.north}``;
      params.bounded = 1;
    }

    // Soft viewbox bias from reference city (+-1.5 deg ~ 150km) if no explicit bounds
    if (!filters.bounds && filters.refCityLat && filters.refCityLng) {
      const rLat = parseFloat(filters.refCityLat);
      const rLng = parseFloat(filters.refCityLng);
      const delta = 1.5;
      params.viewbox = ``\${rLng - delta},\${rLat - delta},\${rLng + delta},\${rLat + delta}``;
      params.bounded = 0;
    }"

if ($ac.Contains("Soft viewbox bias from reference city")) {
    Write-Host "[apiClients] Nominatim refCity already applied"
} elseif ($ac.Contains("    // Add viewbox for geographic bounds if provided")) {
    $ac = $ac.Replace($nomOld, $nomNew)
    Write-Host "[apiClients] Nominatim refCity bias applied"
} else {
    Write-Host "[apiClients] Nominatim: target not found"
}

# GeoNames: add proximity params
$geoOld = "    // Add country filter if provided
    if (filters.countryCode) {
      params.country = filters.countryCode;
    }

    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });"

$geoNew = "    // Add country filter if provided
    if (filters.countryCode) {
      params.country = filters.countryCode;
    }

    // Bias search around reference city if provided
    if (filters.refCityLat && filters.refCityLng) {
      params.lat = parseFloat(filters.refCityLat);
      params.lng = parseFloat(filters.refCityLng);
      params.radius = 150;
      params.orderby = 'proximity';
    }

    const response = await client.get(apiConfig.geoNames.searchEndpoint, { params });"

if ($ac.Contains("params.orderby = 'proximity'")) {
    Write-Host "[apiClients] GeoNames proximity already applied"
} elseif ($ac.Contains("    // Add country filter if provided")) {
    $ac = $ac.Replace($geoOld, $geoNew)
    Write-Host "[apiClients] GeoNames proximity applied"
} else {
    Write-Host "[apiClients] GeoNames: target not found"
}

# Photon: use refCityLat/refCityLng as location bias
$photonOld = "    // Add location bias if provided
    if (filters.lat && filters.lng) {
      params.lat = filters.lat;
      params.lon = filters.lng;
    }"

$photonNew = "    // Add location bias - prefer refCity coordinates, fallback to generic lat/lng
    const photonLat = filters.refCityLat || filters.lat;
    const photonLng = filters.refCityLng || filters.lng;
    if (photonLat && photonLng) {
      params.lat = parseFloat(photonLat);
      params.lon = parseFloat(photonLng);
    }"

if ($ac.Contains("prefer refCity coordinates")) {
    Write-Host "[apiClients] Photon refCity already applied"
} elseif ($ac.Contains("    // Add location bias if provided")) {
    $ac = $ac.Replace($photonOld, $photonNew)
    Write-Host "[apiClients] Photon refCity bias applied"
} else {
    Write-Host "[apiClients] Photon: target not found"
}

[System.IO.File]::WriteAllText($acPath, $ac)
Write-Host "[apiClients] Saved."

# ─────────────────────────────────────────────────────────────────────────────
# 3. geoAgent.js — add refCity proximity to GeoNames and Photon sub-calls
# ─────────────────────────────────────────────────────────────────────────────
$gaPath = "backend\services\geoAgent.js"
$ga = [System.IO.File]::ReadAllText($gaPath)

# GeoNames in geoAgent: add proximity params when refLat/refLng available
$gaGeoOld = "      params: { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },"
$gaGeoNew = "      params: Object.assign(
        { q: villageName, country: country || '', maxRows: 3, username, featureClass: 'P' },
        (refLat && refLng) ? { lat: refLat, lng: refLng, radius: 150, orderby: 'proximity' } : {}
      ),"

if ($ga.Contains("radius: 150, orderby: 'proximity'")) {
    Write-Host "[geoAgent] GeoNames proximity already applied"
} elseif ($ga.Contains($gaGeoOld)) {
    $ga = $ga.Replace($gaGeoOld, $gaGeoNew)
    Write-Host "[geoAgent] GeoNames proximity applied"
} else {
    Write-Host "[geoAgent] GeoNames: target not found"
}

# Photon in geoAgent: add lat/lon bias
$gaPhotonOld = "      params: { q: ``\${villageName}\${country ? ', ' + country : ''}``, limit: 3 },"
$gaPhotonNew = "      params: Object.assign(
        { q: ``\${villageName}\${country ? ', ' + country : ''}``, limit: 3 },
        (refLat && refLng) ? { lat: refLat, lon: refLng } : {}
      ),"

if ($ga.Contains("(refLat && refLng) ? { lat: refLat, lon: refLng }")) {
    Write-Host "[geoAgent] Photon bias already applied"
} elseif ($ga.Contains($gaPhotonOld)) {
    $ga = $ga.Replace($gaPhotonOld, $gaPhotonNew)
    Write-Host "[geoAgent] Photon bias applied"
} else {
    Write-Host "[geoAgent] Photon: target not found"
}

[System.IO.File]::WriteAllText($gaPath, $ga)
Write-Host "[geoAgent] Saved."

Write-Host ""
Write-Host "=== Verification ==="
$gs2 = [System.IO.File]::ReadAllText($gsPath)
$ac2 = [System.IO.File]::ReadAllText($acPath)
$ga2 = [System.IO.File]::ReadAllText($gaPath)

Write-Host ("1a geoAgent filters: " + $(if ($gs2.Contains("geoAgent(villageName, filters.country || filters.countryCode || '', filters)")) {"OK"} else {"MISSING"}))
Write-Host ("1b country guard:    " + $(if ($gs2.Contains("_bestNameSim < 0.35")) {"OK"} else {"MISSING"}))
Write-Host ("2a Nominatim refCity:" + $(if ($ac2.Contains("Soft viewbox bias from reference city")) {"OK"} else {"MISSING"}))
Write-Host ("2b GeoNames prox:    " + $(if ($ac2.Contains("params.orderby = 'proximity'")) {"OK"} else {"MISSING"}))
Write-Host ("2c Photon refCity:   " + $(if ($ac2.Contains("prefer refCity coordinates")) {"OK"} else {"MISSING"}))
Write-Host ("3a geoAgent GeoNames:" + $(if ($ga2.Contains("radius: 150, orderby: 'proximity'")) {"OK"} else {"MISSING"}))
Write-Host ("3b geoAgent Photon:  " + $(if ($ga2.Contains("(refLat && refLng) ? { lat: refLat, lon: refLng }")) {"OK"} else {"MISSING"}))
Write-Host ""
Write-Host "Done."
