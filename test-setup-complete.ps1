# Test setup-complete endpoint
$ErrorActionPreference = "Stop"

Write-Host "`n=== Testing Setup Complete Endpoint ===" -ForegroundColor Cyan

$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"

Write-Host "`nTest 1: With registered UID (should return true)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=$uid"
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    if ($response.is_setup_completed -eq $true) {
        Write-Host "✅ Correctly returns true for registered user" -ForegroundColor Green
    } else {
        Write-Host "❌ Should return true but got false" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest 2: With unregistered UID (should return false)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete?uid=nonexistent123"
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    if ($response.is_setup_completed -eq $false) {
        Write-Host "✅ Correctly returns false for unregistered user" -ForegroundColor Green
    } else {
        Write-Host "❌ Should return false but got true" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest 3: Without UID (should return false)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/setup-complete"
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    if ($response.is_setup_completed -eq $false) {
        Write-Host "✅ Correctly returns false when no UID provided" -ForegroundColor Green
    } else {
        Write-Host "❌ Should return false but got true" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
