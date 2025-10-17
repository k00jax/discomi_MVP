# Test with EXACT Omi documentation payload
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n=== Testing Official Omi Payload Format ===" -ForegroundColor Cyan

$appToken = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"
$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"

# Exact payload from Omi docs
$payload = @{
    id = 0
    created_at = "2024-07-22T23:59:45.910559+00:00"
    started_at = "2024-07-21T22:34:43.384323+00:00"
    finished_at = "2024-07-21T22:35:43.384323+00:00"
    transcript_segments = @(
        @{
            text = "Testing Omi official payload format"
            speaker = "SPEAKER_00"
            speakerId = 0
            is_user = $false
            start = 10.0
            end = 20.0
        }
    )
    photos = @()
    structured = @{
        title = "Test Memory from Official Format"
        overview = "Testing the exact payload format from Omi documentation"
        emoji = "🗣️"
        category = "personal"
        action_items = @()
        events = @()
    }
    apps_response = @()
    discarded = $false
} | ConvertTo-Json -Depth 10

Write-Host "`nTest 1: With uid in query (as per Omi docs)" -ForegroundColor Yellow
$url1 = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken&uid=$uid"
Write-Host "URL: $url1" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Method POST -Uri $url1 -ContentType "application/json; charset=utf-8" -Body $payload
    Write-Host "✅ SUCCESS with uid in query!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest 2: WITHOUT uid (test single-user fallback)" -ForegroundColor Yellow
$url2 = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken"
Write-Host "URL: $url2" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Method POST -Uri $url2 -ContentType "application/json; charset=utf-8" -Body $payload
    Write-Host "✅ SUCCESS with single-user fallback!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ FAILED (expected if fallback not working)" -ForegroundColor Yellow
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "Response body: $body" -ForegroundColor Yellow
        } catch {}
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If Test 1 passed: UID extraction from query works (Omi standard)" -ForegroundColor White
Write-Host "If Test 2 passed: Single-user fallback works (app store maybe?)" -ForegroundColor White
Write-Host "`nCheck Discord for test messages!" -ForegroundColor Green
