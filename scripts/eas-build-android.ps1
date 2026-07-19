# Foolproof Windows EAS Android build.
# Copies project to C:\eas-build\scan-perks WITHOUT .git / lock-prone folders.

$ErrorActionPreference = "Stop"

$SourceRoot = Split-Path -Parent $PSScriptRoot
$BuildRoot = "C:\eas-build\scan-perks"
$TempRoot = "C:\Temp\eas-build-$PID"
$ProfileName = if ($args.Count -gt 0) { $args[0] } else { "production" }

Write-Host "Source: $SourceRoot"
Write-Host "Build copy: $BuildRoot"
Write-Host "Temp: $TempRoot"
Write-Host "Profile: $ProfileName"

New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
New-Item -ItemType Directory -Force -Path "C:\eas-build" | Out-Null

if (Test-Path $BuildRoot) {
  Write-Host "Removing previous build copy..."
  cmd /c "rmdir /s /q `"$BuildRoot`"" | Out-Null
  Start-Sleep -Seconds 2
}

New-Item -ItemType Directory -Force -Path $BuildRoot | Out-Null

$excludeDirs = @(
  ".git",
  ".github",
  "node_modules",
  "dist",
  ".expo",
  ".expo-shared",
  ".idea",
  ".bolt",
  ".vscode",
  "web-build",
  "coverage",
  "android",
  "ios",
  "functions\node_modules"
)

Write-Host "Copying project (excluding lock-prone folders)..."
$robocopyArgs = @($SourceRoot, $BuildRoot, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np", "/XD") + $excludeDirs
& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

# Belt-and-suspenders: delete anything that still causes EPERM on Windows cleanup
@(
  ".git", ".bolt", ".idea", ".expo", ".expo-shared", "dist", "web-build", ".vscode"
) | ForEach-Object {
  $path = Join-Path $BuildRoot $_
  if (Test-Path $path) {
    cmd /c "rmdir /s /q `"$path`"" | Out-Null
    Write-Host "Removed $path"
  }
}

Set-Location $BuildRoot

$env:EAS_NO_VCS = "1"
$env:EXPO_NO_GIT_STATUS = "1"
$env:EAS_PROJECT_ROOT = $BuildRoot
$env:EAS_BUILD_NO_EXPO_GO_WARNING = "true"
$env:TEMP = $TempRoot
$env:TMP = $TempRoot
$env:TMPDIR = $TempRoot

Write-Host "Installing dependencies in build copy..."
if (Test-Path (Join-Path $SourceRoot "package-lock.json")) {
  Copy-Item (Join-Path $SourceRoot "package-lock.json") (Join-Path $BuildRoot "package-lock.json") -Force
}
npm ci --prefer-offline --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm ci failed, falling back to npm install..."
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

Write-Host "EAS_NO_VCS=$env:EAS_NO_VCS | EAS_PROJECT_ROOT=$env:EAS_PROJECT_ROOT"
Write-Host "Starting EAS build..."

npx --yes eas-cli@latest build --platform android --profile $ProfileName
$buildExit = $LASTEXITCODE

Set-Location $SourceRoot

if ($buildExit -ne 0) {
  Write-Host ""
  Write-Host "Local upload failed (exit $buildExit)."
  Write-Host "Use GitHub Actions instead (recommended on Windows/OneDrive):"
  Write-Host "  1) Create token: https://expo.dev/settings/access-tokens"
  Write-Host "  2) GitHub repo -> Settings -> Secrets -> EXPO_TOKEN"
  Write-Host "  3) Actions -> Build Android (EAS) -> Run workflow"
  exit $buildExit
}

Write-Host "Build submitted. Original project unchanged: $SourceRoot"
