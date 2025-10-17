# Comprehensive Diagnostic for DiscOmi App Store Integration
$ErrorActionPreference = "Stop"

Write-Host "`n=== DiscOmi Live App Diagnostic ===" -ForegroundColor Cyan
Write-Host "Checking why automatic posting stopped working...`n" -ForegroundColor Yellow

$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$admin = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"
$appToken = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"

# 1. Check user registration
Write-Host "1. Checking user registration in Supabase..." -ForegroundColor Yellow
try {
    $diag = Invoke-RestMethod -Headers @{ "x-admin-key" = $admin } -Uri "https://discomi-mvp-ochre.vercel.app/api/diag?uid=$uid"
    
    if ($diag.hasRow) {
        Write-Host "   ✅ User is registered" -ForegroundColor Green
        Write-Host "   Token: $($diag.row.tokenPrefix)" -ForegroundColor Gray
        Write-Host "   Discord: $($diag.row.webhookUrl.Substring(0, 60))..." -ForegroundColor Gray
    } else {
        Write-Host "   ❌ User NOT registered!" -ForegroundColor Red
        Write-Host "   This could be why it's not working." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error checking registration: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check setup status
Write-Host "`n2. Checking setup status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=$uid"
    
    if ($status.is_setup_completed) {
        Write-Host "   ✅ Setup is complete" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Setup NOT complete" -ForegroundColor Red
        Write-Host "   Omi may not be calling your webhook if setup incomplete" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error checking setup: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test webhook with app token (simulating Omi app store call)
Write-Host "`n3. Testing webhook with app token (app store path)..." -ForegroundColor Yellow

$payload = @{
    id = 123456
    created_at = (Get-Date -Format "o")
    started_at = (Get-Date).AddMinutes(-5).ToString("o")
    finished_at = (Get-Date -Format "o")
    transcript_segments = @(
        @{
            text = "Diagnostic test from app store integration path. Testing if webhook works with app token."
            speaker = "SPEAKER_00"
            speakerId = 0
            is_user = $true
            start = 0.0
            end = 5.0
        }
    )
    structured = @{
        title = "App Store Integration Test"
        overview = "Testing automatic posting via app store installation"
        emoji = "test"
        category = "personal"
        action_items = @()
        events = @()
    }
    photos = @()
    apps_response = @()
    discarded = $false
} | ConvertTo-Json -Depth 10

$appStoreUrl = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken" + "&uid=$uid"

Write-Host "   URL: $appStoreUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Method POST -Uri $appStoreUrl -ContentType "application/json; charset=utf-8" -Body $payload
    Write-Host "   ✅ App store webhook path WORKS!" -ForegroundColor Green
    Write-Host "   Response: $response" -ForegroundColor Cyan
    Write-Host "   📬 Check Discord - should see diagnostic message!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ App store webhook FAILED" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "   Response body: $body" -ForegroundColor Yellow
        } catch {}
    }
}

# 4. Check recent Vercel logs
Write-Host "`n4. Checking recent webhook calls (last 5 minutes)..." -ForegroundColor Yellow
Write-Host "   Run this command to see real-time logs:" -ForegroundColor Gray
Write-Host "   vercel logs discomi-mvp-ochre.vercel.app" -ForegroundColor Cyan

# Summary
Write-Host "`n=== DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan
Write-Host "`nPossible causes if automatic posting does not work:" -ForegroundColor Yellow
Write-Host "1. ❓ App store integration not fully configured" -ForegroundColor White
Write-Host "   - Check if webhook URL in app submission matches" -ForegroundColor Gray
Write-Host "   - Verify: https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken" -ForegroundColor Gray

Write-Host "`n2. ❓ UID mismatch between app store and registration" -ForegroundColor White
Write-Host "   - App store may be sending different UID than developer settings" -ForegroundColor Gray
Write-Host "   - Check what UID the app store uses for your account" -ForegroundColor Gray

Write-Host "`n3. ❓ Omi caching old webhook URL" -ForegroundColor White
Write-Host "   - Try uninstalling and reinstalling the app" -ForegroundColor Gray
Write-Host "   - Omi might be caching the old developer webhook URL" -ForegroundColor Gray

Write-Host "`n4. ❓ App not fully approved/enabled" -ForegroundColor White
Write-Host "   - Verify app is actually calling webhooks for memories" -ForegroundColor Gray
Write-Host "   - Check Omi app settings for integration status" -ForegroundColor Gray

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Create a conversation and check Vercel logs immediately" -ForegroundColor White
Write-Host "2. See if ANY request comes in (even if it fails)" -ForegroundColor White
Write-Host "3. Check what UID is being sent in the logs" -ForegroundColor White
Write-Host "4. Compare with your registered UID: $uid" -ForegroundColor White

Write-Host "`nRun Vercel logs:" -ForegroundColor Yellow
Write-Host "vercel logs discomi-mvp-ochre.vercel.app --since 5m" -ForegroundColor Cyan
