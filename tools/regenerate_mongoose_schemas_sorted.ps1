param(
  [string]$RepoRoot = (Resolve-Path '.').Path,
  [string]$OutFile = 'docs/MONGOOSE_SCHEMAS_ALL.txt'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $RepoRoot

$modelsDir = Join-Path $RepoRoot 'backend/models'
if (-not (Test-Path -LiteralPath $modelsDir)) {
  throw "backend/models not found at: $modelsDir"
}

$models = @(Get-ChildItem -LiteralPath $modelsDir -Filter '*.js' | Sort-Object Name | Select-Object -ExpandProperty Name)

$order = @(
  # Users
  'User.js',
  'Admin.js',
  'Student.js',
  'Teacher.js',

  # Academic management
  'AcademicYear.js',
  'Cohort.js',
  'Grade.js',
  'GradeSection.js',
  'Subject.js',
  'TeacherAssignment.js',
  'Enrollment.js',
  'TransferLog.js',

  # Setup
  'Shift.js',
  'Counter.js',

  # Exams
  'ExamType.js',
  'Exam.js',
  'ExamScore.js',

  # Operations
  'AttendanceRecord.js',
  'AttendanceAuditLog.js',
  'Timetable.js',
  'LessonPlan.js',
  'LibraryResource.js',
  'AiChatThread.js',

  # Finance
  'FinanceCategory.js',
  'FinanceAppointment.js',
  'FeeType.js',
  'FeeStructure.js',
  'Fee.js',
  'StudentFee.js',
  'FeeInvoice.js',
  'FeePayment.js',
  'FeeTransaction.js',
  'Expense.js',
  'Payroll.js',
  'Account.js',
  'PaymentLog.js',
  'Donor.js',
  'Donation.js',

  # System settings
  'PrivacySettings.js',
  'AuthLockEvent.js',
  'AuditLog.js',
  'ActivityNotification.js',

  # Announcements
  'Announcement.js'
)

$missingInDir = @($order | Where-Object { $_ -notin $models })
$notOrdered = @($models | Where-Object { $_ -notin $order })
$dups = @($order | Group-Object | Where-Object { $_.Count -gt 1 })

if ($missingInDir.Count -gt 0) {
  throw "Order contains files not in backend/models: $($missingInDir -join ', ')"
}
if ($notOrdered.Count -gt 0) {
  throw "Some backend/models files are not in order list: $($notOrdered -join ', ')"
}
if ($dups.Count -gt 0) {
  throw "Duplicate entries in order list: $($dups | ForEach-Object { $_.Name + ' x' + $_.Count } -join ', ')"
}

$outPath = Join-Path $RepoRoot ($OutFile -replace '/', '\\')
$outDir = Split-Path -Parent $outPath
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$tempPath = Join-Path $outDir ('.' + (Split-Path -Leaf $outPath) + '.tmp')
$fallbackSortedPath = Join-Path $outDir (([IO.Path]::GetFileNameWithoutExtension($outPath)) + '.SORTED.txt')
$now = (Get-Date).ToString('s')

'Nuuru Al-Bayaan - All Mongoose Schemas (backend/models/*.js)' | Set-Content -LiteralPath $tempPath -Encoding UTF8
("Generated: $now") | Add-Content -LiteralPath $tempPath -Encoding UTF8
'Order: Users -> Academic -> Setup -> Exams -> Operations -> Finance -> SystemSettings -> Announcements' | Add-Content -LiteralPath $tempPath -Encoding UTF8
'' | Add-Content -LiteralPath $tempPath -Encoding UTF8

foreach ($name in $order) {
  $path = Join-Path $modelsDir $name

  '============================================================' | Add-Content -LiteralPath $tempPath -Encoding UTF8
  ("FILE: $name") | Add-Content -LiteralPath $tempPath -Encoding UTF8
  '============================================================' | Add-Content -LiteralPath $tempPath -Encoding UTF8
  '' | Add-Content -LiteralPath $tempPath -Encoding UTF8

  Get-Content -LiteralPath $path | Add-Content -LiteralPath $tempPath -Encoding UTF8

  '' | Add-Content -LiteralPath $tempPath -Encoding UTF8
  '' | Add-Content -LiteralPath $tempPath -Encoding UTF8
}

$sections = (Select-String -LiteralPath $tempPath -Pattern '^FILE:' -AllMatches).Count
if ($sections -ne $models.Count) {
  throw "Mismatch: sections=$sections but modelFiles=$($models.Count). Temp output is incomplete."
}

try {
  if (Test-Path -LiteralPath $outPath) {
    Remove-Item -LiteralPath $outPath -Force
  }
  Move-Item -LiteralPath $tempPath -Destination $outPath -Force

  Write-Output ("WROTE=$outPath")
  Write-Output ("BYTES=" + (Get-Item -LiteralPath $outPath).Length)
  Write-Output ("SECTIONS=$sections")
  Write-Output ("MODELFILES=" + $models.Count)
  Write-Output ("FIRST=" + ((Select-String -LiteralPath $outPath -Pattern '^FILE:' | Select-Object -First 1).Line))
  Write-Output ("LAST=" + ((Select-String -LiteralPath $outPath -Pattern '^FILE:' | Select-Object -Last 1).Line))
} catch {
  Copy-Item -LiteralPath $tempPath -Destination $fallbackSortedPath -Force
  Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue

  Write-Warning "Could not replace output file (it may be open/locked): $outPath"
  Write-Output ("WROTE_FALLBACK=$fallbackSortedPath")
  Write-Output ("SECTIONS=$sections")
  Write-Output ("MODELFILES=" + $models.Count)
  throw
}


