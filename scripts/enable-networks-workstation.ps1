$ErrorActionPreference = 'Stop'

function Write-Step([string]$message) {
  Write-Host "[enable-networks] $message"
}

function Initialize-Cloudflared {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd) {
    Write-Step 'cloudflared found.'
    return
  }

  Write-Step 'cloudflared not found; attempting install via winget...'
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw 'cloudflared is not installed and winget is unavailable. Install cloudflared manually, then rerun this command.'
  }

  & winget install --id Cloudflare.cloudflared --exact --accept-package-agreements --accept-source-agreements | Out-Null

  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw 'cloudflared installation did not complete successfully. Install it manually and rerun.'
  }

  Write-Step 'cloudflared installed.'
}

function Initialize-CloudflareLogin {
  $certPath = Join-Path $HOME '.cloudflared/cert.pem'
  if (Test-Path $certPath) {
    Write-Step 'cloudflared login already present.'
    return
  }

  Write-Step 'Opening Cloudflare login flow (one-time)...'
  & cloudflared tunnel login

  if (-not (Test-Path $certPath)) {
    throw 'Cloudflare login did not finish (cert.pem missing). Rerun and complete browser auth.'
  }

  Write-Step 'cloudflared login completed.'
}

function New-Token {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Get-DotEnvValue([string]$envPath, [string]$key) {
  if (-not (Test-Path $envPath)) { return '' }
  $pattern = "^$([regex]::Escape($key))=(.*)$"
  $lines = Get-Content -Path $envPath
  foreach ($line in $lines) {
    if ($line -match $pattern) {
      return $Matches[1].Trim()
    }
  }
  return ''
}

function Set-DotEnvValue([string]$envPath, [string]$key, [string]$value) {
  $lines = @()
  if (Test-Path $envPath) {
    $lines = Get-Content -Path $envPath
  }

  $updated = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^${key}=") {
      $lines[$i] = "${key}=${value}"
      $updated = $true
      break
    }
  }

  if (-not $updated) {
    $lines += "${key}=${value}"
  }

  Set-Content -Path $envPath -Value $lines -Encoding UTF8
}

function Get-StableToken([string]$envPath, [string]$tokenFile) {
  $existing = Get-DotEnvValue -envPath $envPath -key 'YTHRIL_LOCAL_AGENT_TOKEN'
  if ($existing) {
    return $existing
  }

  if (Test-Path $tokenFile) {
    try {
      $fileToken = (Get-Content -Path $tokenFile -Raw).Trim()
      if ($fileToken) {
        return $fileToken
      }
    } catch {
      # ignore token file read errors; fall back to new token generation
    }
  }

  return New-Token
}

function Test-HelperAuth([string]$token) {
  try {
    Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:38123/v1/status' -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Initialize-HelperRunning([string]$repoRoot, [string]$token) {
  $isListening = $false
  try {
    $listen = Get-NetTCPConnection -LocalPort 38123 -State Listen -ErrorAction Stop
    if ($listen) { $isListening = $true }
  } catch {
    $isListening = $false
  }

  if ($isListening) {
    if (Test-HelperAuth -token $token) {
      Write-Step 'local helper already listening on 127.0.0.1:38123 and token is valid.'
      return
    }
    throw 'Port 38123 is already in use, but helper auth failed with the configured token. Stop the stale process and rerun.'
  }

  Write-Step 'Starting local helper service in background...'
  # Token is read from the token file by the connector; do not embed it in the command
  # line where it would be visible to other local processes via Get-CimInstance / Task Manager.
  $cmd = "Set-Location '$repoRoot'; npm run local-connector:dev --workspace=server"
  $psExe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' }
  Start-Process -FilePath $psExe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd) -WindowStyle Minimized | Out-Null
  Write-Step 'local helper started.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot '.env'
$tokenFile = Join-Path $HOME '.ythril-local-connector/token'

Write-Step 'Preparing workstation for Enable Networks auto setup...'
Initialize-Cloudflared
Initialize-CloudflareLogin

$token = Get-StableToken -envPath $envPath -tokenFile $tokenFile

# Persist the resolved token to the state file so the connector can discover it
# without needing it injected on the command line.
$tokenDir = Split-Path -Parent $tokenFile
if (-not (Test-Path $tokenDir)) { New-Item -ItemType Directory -Path $tokenDir -Force | Out-Null }
Set-Content -Path $tokenFile -Value $token -Encoding UTF8 -NoNewline

Set-DotEnvValue -envPath $envPath -key 'YTHRIL_LOCAL_AGENT_ENABLED' -value 'true'
Set-DotEnvValue -envPath $envPath -key 'YTHRIL_LOCAL_AGENT_URL' -value 'http://127.0.0.1:38123'
Set-DotEnvValue -envPath $envPath -key 'YTHRIL_LOCAL_AGENT_TOKEN' -value $token
Write-Step 'Wrote/updated .env values for local-agent integration.'

Initialize-HelperRunning -repoRoot $repoRoot -token $token

Write-Step 'Restarting Ythril container to apply env changes...'
Set-Location $repoRoot
& docker compose up -d ythril

Write-Step 'Done. Open Settings -> Networks -> Enable Networks.'
