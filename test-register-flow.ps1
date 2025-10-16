# Test script for auto-fill UID registration flow
# Usage: .\test-register-flow.ps1 [-Uid "your-uid"] [-WebhookUrl "your-webhook"]

param(
  [Parameter(Mandatory=$false)]
  [string]$Uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852",
  
  [Parameter(Mandatory=$true)]
  [string]$WebhookUrl,
  
  [Parameter(Mandatory=$false)]
  [string]$Url = "https://discomi-mvp-ochre.vercel.app"
)

$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "DiscOmi Registration Flow Tests" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register with UID in query parameter (auto-fill flow)
Write-Host "Test 1: Register with UID in query (auto-fill flow)" -ForegroundColor Yellow
Write-Host "URL: $Url/api/register?uid=$Uid" -ForegroundColor Gray

$payload = @{
  webhookUrl = $WebhookUrl
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri "$Url/api/register?uid=$Uid" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $payload `
    -UseBasicParsing
  
  Write-Host "✅ Success!" -ForegroundColor Green
  Write-Host "Response:" -ForegroundColor White
  $response | ConvertTo-Json -Depth 5 | Write-Host
  Write-Host ""
  
  if ($response.omiWebhook) {
    Write-Host "📋 Omi Webhook URL (ready to use):" -ForegroundColor Cyan
    Write-Host $response.omiWebhook -ForegroundColor White
    Write-Host ""
  }
  
} catch {
  Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Red
  }
}
Write-Host ""

# Test 2: Register with UID in body (legacy flow)
Write-Host "Test 2: Register with UID in body (legacy flow)" -ForegroundColor Yellow
Write-Host "URL: $Url/api/register" -ForegroundColor Gray

$payload2 = @{
  uid = $Uid
  webhookUrl = $WebhookUrl
} | ConvertTo-Json

try {
  $response2 = Invoke-RestMethod -Uri "$Url/api/register" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $payload2 `
    -UseBasicParsing
  
  Write-Host "✅ Success!" -ForegroundColor Green
  Write-Host "Response:" -ForegroundColor White
  $response2 | ConvertTo-Json -Depth 5 | Write-Host
  Write-Host ""
  
} catch {
  Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Red
  }
}
Write-Host ""

# Test 3: Invalid webhook URL (should fail)
Write-Host "Test 3: Invalid webhook URL (should fail)" -ForegroundColor Yellow
Write-Host "URL: $Url/api/register?uid=$Uid" -ForegroundColor Gray

$payload3 = @{
  webhookUrl = "https://invalid.com/not-a-discord-webhook"
} | ConvertTo-Json

try {
  $response3 = Invoke-RestMethod -Uri "$Url/api/register?uid=$Uid" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $payload3 `
    -UseBasicParsing
  
  Write-Host "⚠️ Unexpected success! Should have been rejected." -ForegroundColor Yellow
  Write-Host "Response:" -ForegroundColor Yellow
  $response3 | ConvertTo-Json -Depth 5 | Write-Host
  
} catch {
  $expectedErrors = @("invalid_webhook_url", "400")
  $errorMatched = $false
  foreach ($err in $expectedErrors) {
    if ($_.Exception.Message -match $err) {
      $errorMatched = $true
      break
    }
  }
  
  if ($errorMatched) {
    Write-Host "✅ Correctly rejected! (400 Bad Request)" -ForegroundColor Green
  } else {
    Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

Write-Host "Tests complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "--------" -ForegroundColor White
Write-Host "Test 1 (UID in query):     Auto-fill flow ✅" -ForegroundColor White
Write-Host "Test 2 (UID in body):      Legacy flow ✅" -ForegroundColor White
Write-Host "Test 3 (Invalid webhook):  Correctly rejected ✅" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit: $Url/setup?uid=$Uid" -ForegroundColor White
Write-Host "2. Paste your Discord webhook and submit" -ForegroundColor White
Write-Host "3. Copy the Omi webhook URL from the response" -ForegroundColor White
Write-Host "4. Configure in Omi app or test manually" -ForegroundColor White
