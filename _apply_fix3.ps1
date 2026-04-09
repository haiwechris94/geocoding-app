$file = "backend\services\geocodingService.js"
$content = Get-Content $file -Raw -Encoding UTF8

# PATCH A — Insérer filtre validResults + guard clause après le tri
$searchA = "  const bestResult = scoredResults[0];"
$replaceA = @"
  // FIX 3 — Filtrer les résultats dont le nom est trop éloigné du village cherché.
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

  const bestResult = validResults[0];
"@

if ($content.Contains($searchA)) {
    $content = $content.Replace($searchA, $replaceA)
    Write-Host "PATCH A OK"
} else { Write-Host "PATCH A: cible non trouvée" }

# PATCH B — nameSuggestions utilise validResults
$searchB = "  const nameSuggestions = generateNameSuggestions(villageName, results, 5);"
$replaceB = "  const nameSuggestions = generateNameSuggestions(villageName, validResults, 5);"
if ($content.Contains($searchB)) {
    $content = $content.Replace($searchB, $replaceB)
    Write-Host "PATCH B OK"
} else { Write-Host "PATCH B: cible non trouvée" }

# PATCH C — alternativeResults utilise validResults
$searchC = "    alternativeResults: scoredResults.slice(1, 4), // Top 3 alternatives"
$replaceC = "    alternativeResults: validResults.slice(1, 4), // Top 3 alternatives"
if ($content.Contains($searchC)) {
    $content = $content.Replace($searchC, $replaceC)
    Write-Host "PATCH C OK"
} else { Write-Host "PATCH C: cible non trouvée" }

# PATCH D — Seuil fuzzyMatch 0.55 -> 0.45
$searchD = "      if (similarity >= 0.55) { // At least 55% similar (Option 4: lowered threshold)"
$replaceD = "      if (similarity >= 0.45) { // FIX 3 — seuil relevé pour éviter les faux positifs (ex: nom du pays)"
if ($content.Contains($searchD)) {
    $content = $content.Replace($searchD, $replaceD)
    Write-Host "PATCH D OK"
} else { Write-Host "PATCH D: cible non trouvée" }

# PATCH E — Message simplifié "Village non trouvé"
$searchE = "      en: 'Village not found, even with fuzzy matching',"
$replaceE = "      en: 'Village not found',"
if ($content.Contains($searchE)) {
    $content = $content.Replace($searchE, $replaceE)
    Write-Host "PATCH E (en) OK"
} else { Write-Host "PATCH E (en): cible non trouvée" }

$searchF = "      fr: 'Village non trouvé, même avec correspondance approximative'"
$replaceF = "      fr: 'Village non trouvé'"
if ($content.Contains($searchF)) {
    $content = $content.Replace($searchF, $replaceF)
    Write-Host "PATCH E (fr) OK"
} else { Write-Host "PATCH E (fr): cible non trouvée" }

# Écriture
[System.IO.File]::WriteAllText((Resolve-Path $file), $content, [System.Text.Encoding]::UTF8)
Write-Host "Fichier mis à jour avec succès."
