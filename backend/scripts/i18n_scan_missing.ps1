$ErrorActionPreference = 'Stop'

$backendPath = Join-Path (Get-Location) 'backend'
$mmPath = Join-Path $backendPath 'i18n\messageMap.js'

$files = Get-ChildItem -LiteralPath $backendPath -Recurse -Filter '*.js' |
  Where-Object { $_.FullName -notmatch '\\i18n\\messageMap\.js$' }

$captured = New-Object 'System.Collections.Generic.HashSet[string]'

foreach ($f in $files) {
  $txt = Get-Content -LiteralPath $f.FullName -Raw

  foreach ($m in [regex]::Matches($txt, "(?s)\bmessage\s*:\s*([\"'`])(.+?)\1")) {
    $null = $captured.Add($m.Groups[2].Value.Trim())
  }
  foreach ($m in [regex]::Matches($txt, "(?s)\berror\s*:\s*([\"'`])(.+?)\1")) {
    $null = $captured.Add($m.Groups[2].Value.Trim())
  }
}

$mm = Get-Content -LiteralPath $mmPath -Raw
$known = New-Object 'System.Collections.Generic.HashSet[string]'

foreach ($m in [regex]::Matches($mm, "(?m)^\s*[\"'](.+?)[\"']\s*:\s*[\"']")) {
  $null = $known.Add($m.Groups[1].Value)
}

$missing = @($captured | Where-Object { -not $known.Contains($_) } | Sort-Object)

Write-Output ("CAPTURED=" + $captured.Count)
Write-Output ("MISSING=" + $missing.Count)

$missing | Select-Object -First 300

if ($missing.Count -gt 300) {
  Write-Output ("...and " + ($missing.Count - 300) + " more")
}
