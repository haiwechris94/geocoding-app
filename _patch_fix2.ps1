$file = "backend\services\geocodingService.js"
$content = [System.IO.File]::ReadAllText($file)
$old = "geoAgent(villageName, filters.country || filters.countryCode || '')"
$new = "geoAgent(villageName, filters.country || filters.countryCode || '', filters)"
if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host "FIX 2 APPLIED"
} elseif ($content.Contains($new)) {
    Write-Host "FIX 2 ALREADY APPLIED"
} else {
    Write-Host "PATTERN NOT FOUND"
}
