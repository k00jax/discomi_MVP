# Diagnostic: Why memories aren't posting to Discord

$ErrorActionPreference = "Stop"

Write-Host "`n=== DiscOmi Diagnostic ===" -ForegroundColor Cyan

$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$admin = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"

# 1. Check user registration
Write-Host "`n1. Checking user registration..." -ForegroundColor Yellow
try {
    $diag = Invoke-RestMethod -Headers @{ "x-admin-key" = $admin } -Uri "https://discomi-mvp-ochre.vercel.app/api/diag?uid=$uid"
    
    Write-Host "✅ User is registered" -ForegroundColor Green
    Write-Host "   Token: $($diag.row.tokenPrefix)" -ForegroundColor Gray
    Write-Host "   Discord: $($diag.row.webhookUrl.Substring(0, 60))..." -ForegroundColor Gray
    
    $token = $diag.expectedQueryExample -replace '.*token=([^&]+).*', '$1'
    
} catch {
    Write-Host "❌ User not registered: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Check setup status
Write-Host "`n2. Checking setup status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=$uid"
    
    if ($status.is_setup_completed) {
        Write-Host "✅ Setup is complete" -ForegroundColor Green
    } else {
        Write-Host "❌ Setup not complete" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to check status: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test webhook with realistic payload
Write-Host "`n3. Testing webhook directly..." -ForegroundColor Yellow

$payload = @{
    id = 999
    created_at = (Get-Date -Format "o")
    transcript_segments = @(
        @{
            text = "This is a test memory created by the diagnostic script."
            speaker = "SPEAKER_00"
            speakerId = 0
            is_user = $true
            start = 0.0
            end = 5.0
        }
    )
    structured = @{
        title = "Diagnostic Test Memory"
        overview = "Testing if webhook works with proper authentication"
        emoji = "🧪"
        category = "personal"
    }
} | ConvertTo-Json -Depth 10

$webhookUrl = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=$token&uid=$uid"

try {
    $response = Invoke-RestMethod -Method POST -Uri $webhookUrl -ContentType "application/json" -Body $payload
    Write-Host "✅ Webhook test SUCCESSFUL!" -ForegroundColor Green
    Write-Host "   Response: $response" -ForegroundColor Cyan
    Write-Host "`n✅ CHECK YOUR DISCORD - You should see a test message!" -ForegroundColor Green
} catch {
    Write-Host "❌ Webhook test FAILED" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Show what needs to be configured in Omi
Write-Host "`n=== SOLUTION ===" -ForegroundColor Cyan
Write-Host "Your webhook is working, but Omi isn't calling it." -ForegroundColor Yellow
Write-Host "`nYou need to configure the webhook URL in Omi:" -ForegroundColor White
Write-Host "`n1. Open Omi app" -ForegroundColor White
Write-Host "2. Go to: Settings → Developer → Developer Mode (enable)" -ForegroundColor White
Write-Host "3. Go to: Settings → Developer → Developer Settings" -ForegroundColor White
Write-Host "4. Find: 'Memory Creation Webhook' field" -ForegroundColor White
Write-Host "5. Paste this URL:" -ForegroundColor White
Write-Host "`n   $webhookUrl" -ForegroundColor Cyan
Write-Host "`n6. Save and create a test memory" -ForegroundColor White
Write-Host "`nOR use the app token URL (for app store):" -ForegroundColor Yellow
Write-Host "`n   https://discomi-mvp-ochre.vercel.app/api/webhook?app=app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1&uid=$uid" -ForegroundColor Cyan
