# Audio Sentinel Pro Deployment
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Audio Sentinel Pro - Deployment               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

$coreControl = "d:\Developement\Core_Control"
$sentinelPath = Join-Path $coreControl "letterblack-sentinel"
$cepExtPath = Join-Path $coreControl "cep-extensions\audio-sentinel-pro"
$adobeCepPath = "C:\Program Files\Common Files\Adobe\CEP\extensions"

# Step 1: Verify paths
Write-Host "`n[1/4] Verifying paths..." -ForegroundColor Cyan
if (Test-Path $sentinelPath) { Write-Host "  ✓ Sentinel Controller" -ForegroundColor Green }
if (Test-Path $cepExtPath) { Write-Host "  ✓ CEP Extension" -ForegroundColor Green }

# Step 2: Update policy
Write-Host "`n[2/4] Updating Sentinel policy..." -ForegroundColor Cyan
$policyPath = Join-Path $sentinelPath "config\policy.default.json"
$policy = Get-Content $policyPath -Raw | ConvertFrom-Json

if (-not $policy.requesters."cep:ae-audio-sentinel-v1") {
    $policy.requesters | Add-Member -Name "cep:ae-audio-sentinel-v1" -Value @{
        allowAdapters = @("cepTimelineVision")
        allowCommands = @("EXTRACT_TIMELINE_FRAMES", "ANALYZE_VISION", "DETECT_OPTIMAL_MODEL", "GENERATE_AUDIO_FROM_VISION")
        description = "Audio Sentinel Pro CEP Extension"
    }
    $policy | ConvertTo-Json -Depth 10 | Set-Content $policyPath
    Write-Host "  ✓ Policy updated with CEP requester" -ForegroundColor Green
} else {
    Write-Host "  ✓ CEP requester already configured" -ForegroundColor Green
}

# Step 3: Install extension
Write-Host "`n[3/4] Installing CEP extension..." -ForegroundColor Cyan
if (-not (Test-Path $adobeCepPath)) {
    New-Item -Path $adobeCepPath -ItemType Directory -Force | Out-Null
}

$extensionDest = Join-Path $adobeCepPath "audio-sentinel-pro"
if (Test-Path $extensionDest) {
    Remove-Item -Path $extensionDest -Recurse -Force
}

Copy-Item -Path $cepExtPath -Destination $extensionDest -Recurse
Write-Host "  ✓ Extension installed" -ForegroundColor Green

# Step 4: Enable PlayerDebugMode
Write-Host "`n[4/4] Enabling PlayerDebugMode..." -ForegroundColor Cyan
$regPath = "HKCU:\Software\Adobe\CSXS.15"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
New-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
Write-Host "  ✓ PlayerDebugMode enabled" -ForegroundColor Green

# Done
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ DEPLOYMENT COMPLETE                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Start Sentinel Controller (new terminal):" -ForegroundColor White
Write-Host "   cd $sentinelPath" -ForegroundColor Cyan
Write-Host "   npm run run" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Restart Adobe After Effects" -ForegroundColor White
Write-Host ""
Write-Host "3. Open: Window → Extensions → Audio Sentinel Pro" -ForegroundColor White
Write-Host ""
Write-Host "4. Settings → Paste ElevenLabs key → Test Connection" -ForegroundColor White
Write-Host ""
