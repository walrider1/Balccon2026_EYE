$ErrorActionPreference = 'Stop'
$eyeProject = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $eyeProject
$eyeNode = (Get-Command node -ErrorAction Stop).Source
& $eyeNode scripts/preflight.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed.' }
for ($eyeAttempt = 0; $eyeAttempt -lt 5; $eyeAttempt++) {
    & $eyeNode server.js
    if ($LASTEXITCODE -eq 0) { break } # Administrator stop is intentional.
    if ($eyeAttempt -eq 4) { throw 'Server repeatedly failed. Check port and storage.' }
    Start-Sleep -Seconds 5
}
