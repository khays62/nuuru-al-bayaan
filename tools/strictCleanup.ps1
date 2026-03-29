$ErrorActionPreference = 'Stop'

# Strict repo cleanup for deployment: keep only essential docs and remove known artifacts.
# Run from repo root.

$keepDocs = @(
  'docs/README.md',
  'docs/SETUP.md',
  'docs/OVERVIEW.md',
  'docs/API.md',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/DEPLOY_PREP_SOOMAALI.md',
  'docs/DEPLOY_SECURITY_FLOW_SOOMAALI.md',
  'docs/DEPLOY_AUDIT_SOOMAALI.md',
  'docs/DEPLOY_HOSTINGER_VPS_CHECKLIST_SOOMAALI.md'
)

$trackedDocs = @(git ls-files -- docs | ForEach-Object { $_.Trim() }) | Where-Object { $_ -like 'docs/*' }

$removeDocs = $trackedDocs | Where-Object {
  ($keepDocs -notcontains $_) -and (
    ($_ -like 'docs/*.md') -or
    ($_ -like 'docs/_drafts/*.md') -or
    ($_ -like 'docs/*.txt')
  )
}

if ($removeDocs.Count -gt 0) {
  Write-Host ("[cleanup] Removing docs: {0}" -f $removeDocs.Count)
  foreach ($path in $removeDocs) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    git rm -- "$path" | Out-Host
  }
} else {
  Write-Host "[cleanup] No docs to remove."
}

$trackedArtifacts = @('frontend/eslint_report.txt')
foreach ($path in $trackedArtifacts) {
  if (-not [string]::IsNullOrWhiteSpace((git ls-files -- "$path"))) {
    Write-Host "[cleanup] Removing tracked artifact: $path"
    git rm -- "$path" | Out-Host
  }
}

$localDelete = @(
  '_tmp_cookies.txt',
  '_tmp_build_check.txt',
  'backend/npm_install_pdfparse.txt',
  'frontend/eslint_errors_quiet_tmp.txt',
  'frontend/eslint_errors_quiet.txt',
  'frontend/eslint_errors_after_batch2.txt',
  'frontend/eslint_errors_after_batch1.txt',
  'frontend/eslint_enrollments.txt',
  'frontend/eslint_phaseB_files2.txt',
  'frontend/eslint_phaseB_files.txt'
)

foreach ($path in $localDelete) {
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "[cleanup] Done"