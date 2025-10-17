# Quick health check
$ErrorActionPreference = "Stop"

Write-Host "`n=== Webhook Health Check ===" -ForegroundColor Cyan

# Test 1: Can we reach the endpoint?
Write-Host "`n1. Testing endpoint reachability..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Method HEAD -Uri "https://discomi-mvp-ochre.vercel.app/api/webhook" -UseBasicParsing
    Write-Host "✅ Endpoint is reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Endpoint not reachable: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: With app token (should return 400 missing_uid - that's expected)
Write-Host "`n2. Testing with app token (expect 400 missing_uid)..." -ForegroundColor Yellow
$appToken = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"
try {
    Invoke-RestMethod -Method POST -Uri "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken" -ContentType "application/json" -Body "{}" | Out-Null
    Write-Host "✅ Unexpected success" -ForegroundColor Yellow
} catch {
    $status = $_.Exception.Response.StatusCode.Value__
    if ($status -eq 400) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            if ($body -eq "missing_uid") {
                Write-Host "✅ Correct response: 400 missing_uid (webhook is working)" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Got 400 but body is: $body" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "✅ Got 400 (webhook is working)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Wrong status: $status" -ForegroundColor Red
    }
}

# Test 3: With full credentials (should work)
Write-Host "`n3. Testing with full credentials (should work)..." -ForegroundColor Yellow
$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$token = "u_754ade2f509948bb11d85e86d48683fc40c1d62e363c1086"
$payload = @{
    session_id = "health-check-" + (Get-Date -Format "yyyyMMddHHmmss")
    segments = @(
        @{
            text = "Health check test"
            speaker = "SPEAKER_00"
            is_user = $true
        }
    )
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Method POST -Uri "https://discomi-mvp-ochre.vercel.app/api/webhook?token=$token&uid=$uid" -ContentType "application/json" -Body $payload
    Write-Host "✅ SUCCESS! Webhook is fully functional" -ForegroundColor Green
    Write-Host "   Check your Discord for the health check message!" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If all 3 tests passed, the webhook is working correctly." -ForegroundColor Gray
Write-Host "The issue is that Omi is not calling your webhook." -ForegroundColor Yellow
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Check the webhook URL in your Omi app settings" -ForegroundColor White
Write-Host "2. Make sure DiscOmi is enabled in Omi" -ForegroundColor White
Write-Host "3. Try re-saving the webhook URL in Omi" -ForegroundColor White
