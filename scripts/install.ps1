#Requires -Version 5.1
<#
.SYNOPSIS
  Cài stali-cli standalone trên Windows (không cần Bun).

.EXAMPLE
  irm https://raw.githubusercontent.com/ngocvu/stali-cli/main/scripts/install.ps1 | iex
  $env:STALI_CLI_VERSION = "v3.12.0"; .\scripts\install.ps1
#>
param(
  [string]$Version = $env:STALI_CLI_VERSION,
  [string]$Repo = $(if ($env:STALI_CLI_GITHUB_REPO) { $env:STALI_CLI_GITHUB_REPO } else { "ngocvu/stali-cli" })
)

$ErrorActionPreference = "Stop"
$StaliHome = if ($env:STALI_HOME) { $env:STALI_HOME } else { Join-Path $env:USERPROFILE ".stali" }
$BinDir = Join-Path $StaliHome "bin"
$StaliExe = Join-Path $BinDir "stali.exe"

function Write-Log($msg) { Write-Host "> $msg" }

if (-not $Version) {
  Write-Error "Thiếu STALI_CLI_VERSION (vd. v3.12.0)"
}

if ($Version -notmatch "^v") { $Version = "v$Version" }

$Asset = "stali-standalone-win-x64"
$Url = "https://github.com/$Repo/releases/download/$Version/$Asset"

Write-Log "Tải $Url"
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
Invoke-WebRequest -Uri $Url -OutFile $StaliExe -UseBasicParsing
# GitHub release may ship without .exe extension — rename if needed
$Downloaded = Join-Path $BinDir $Asset
if (Test-Path $Downloaded) {
  Move-Item -Force $Downloaded $StaliExe
}

$Marker = @{
  mode    = "standalone"
  version = $Version
  asset   = $Asset
  updatedAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json
New-Item -ItemType Directory -Force -Path $StaliHome | Out-Null
Set-Content -Path (Join-Path $StaliHome "install-mode.json") -Value $Marker -Encoding UTF8

# User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$BinDir", "User")
  $env:Path = "$env:Path;$BinDir"
  Write-Log "Đã thêm $BinDir vào User PATH (mở terminal mới nếu cần)"
}

Write-Log "Cài xong. Chạy: stali --version"
if (Test-Path $StaliExe) {
  & $StaliExe --version
} else {
  & (Join-Path $BinDir "stali") --version 2>$null
}
