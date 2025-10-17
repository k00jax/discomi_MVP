# Test single-user fallback (no uid in request)
# This simulates what store-installed app does

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n=== Testing Single-User Fallback ===" -ForegroundColor Cyan

# Sample Omi payload WITHOUT uid parameter
$payload = @{
    session_id = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"
    segments = @(
        @{
            text = "Test memory from fallback test script."
            speaker = "SPEAKER_00"
            speakerId = 0
            is_user = $true
            start = 0.0
            end = 3.5
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "`nSending request WITHOUT uid parameter..." -ForegroundColor Yellow
Write-Host "(Should trigger single-user fallback)`n"

$appToken = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"
$url = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken"

Write-Host "URL: $url`n" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod `
        -Method POST `
        -Uri $url `
        -ContentType "application/json; charset=utf-8" `
        -Body $payload

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host "`n✅ Check your Discord channel for the test message!" -ForegroundColor Green

} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
