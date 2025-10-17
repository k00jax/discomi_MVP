# Quick diagnostic for app store integration
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n=== DiscOmi App Store Diagnostic ===" -ForegroundColor Cyan

$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$admin = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"
$appToken = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"

# 1. Check registration
Write-Host "`n1. Checking user registration..." -ForegroundColor Yellow
try {
    $diag = Invoke-RestMethod -Headers @{ "x-admin-key" = $admin } -Uri "https://discomi-mvp-ochre.vercel.app/api/diag?uid=$uid"
    
    if ($diag.hasRow) {
        Write-Host "   SUCCESS: User is registered" -ForegroundColor Green
    } else {
        Write-Host "   FAILED: User NOT registered" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test app store webhook
Write-Host "`n2. Testing app store webhook..." -ForegroundColor Yellow

$payload = @{
    id = 999
    created_at = (Get-Date -Format "o")
    transcript_segments = @(
        @{
            text = "Test from app store diagnostic"
            speaker = "SPEAKER_00"
            is_user = $true
        }
    )
    structured = @{
        title = "App Store Test"
        overview = "Testing"
        category = "personal"
    }
} | ConvertTo-Json -Depth 10

$url = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken" + "&uid=$uid"

try {
    $response = Invoke-RestMethod -Method POST -Uri $url -ContentType "application/json" -Body $payload
    Write-Host "   SUCCESS: Webhook works!" -ForegroundColor Green
    Write-Host "   Check Discord for test message" -ForegroundColor Cyan
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TROUBLESHOOTING ===" -ForegroundColor Cyan
Write-Host "If automatic posting stopped working:" -ForegroundColor Yellow
Write-Host "1. Check Vercel logs when you create a conversation" -ForegroundColor White
Write-Host "2. See if request comes in with correct UID" -ForegroundColor White
Write-Host "3. Uninstall and reinstall the app from app store" -ForegroundColor White
Write-Host "4. Check if app submission webhook URL is correct" -ForegroundColor White
