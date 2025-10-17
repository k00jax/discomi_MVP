# Test with a realistic Omi payload structure
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n=== Testing Realistic Omi Payload ===" -ForegroundColor Cyan

$appToken = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"
$url = "https://discomi-mvp-ochre.vercel.app/api/webhook?app=$appToken"

# This is what a real Omi payload looks like
$payload = @{
    session_id = "test-" + (Get-Date -Format "yyyyMMddHHmmss")
    segments = @(
        @{
            text = "Testing from PowerShell script."
            speaker = "SPEAKER_00"
            speakerId = 0
            is_user = $true
            start = 0.0
            end = 2.5
        }
    )
    geolocation = @{}
    transcript_segments = @(
        @{
            text = "Testing from PowerShell script."
            speaker = "SPEAKER_00"
            speakerId = 0
            is_user = $true
            person_id = $null
            start = 0.0
            end = 2.5
        }
    )
    photos = @()
} | ConvertTo-Json -Depth 10

Write-Host "Payload structure:" -ForegroundColor Gray
($payload | ConvertFrom-Json) | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor DarkGray

Write-Host "`nSending to: $url" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Method POST `
        -Uri $url `
        -ContentType "application/json; charset=utf-8" `
        -Body $payload

    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host "`n✅ Check Discord for the message!" -ForegroundColor Green

} catch {
    Write-Host "`n❌ FAILED!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody" -ForegroundColor Yellow
        } catch {}
    }
}
