# Test script for APP_WEBHOOK_TOKEN validation
# Usage: .\test-app-token.ps1 [-Uid "your-uid"] [-Url "base-url"]

param(
  [Parameter(Mandatory=$false)]
  [string]$Uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852",
  
  [Parameter(Mandatory=$false)]
  [string]$Url = "https://discomi-mvp-ochre.vercel.app"
)

$PSDefaultParameterValues['*:Encoding'] = 'utf8'
$ErrorActionPreference = "Continue"

Write-Host "DiscOmi App Token Validation Tests" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# The app-level token (as provided)
$APP_TOKEN = "app_9d7c3b2f4e8a1c6d0f2a5b9e3c7d1a4f8b2e6c0d3a7f1b5e9c4d2a8f0b6e3c1"

# Test payload
$payload = @{
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  structured = @{
    title = "DiscOmi app-token test"
    overview = "Testing app-level token validation with REQUIRE_APP_TOKEN toggle."
    category = "idea"
  }
  transcript_segments = @(
    @{ text = "This is a test of the app-level token gate." }
  )
}

$json = $payload | ConvertTo-Json -Depth 10 -Compress

# Test 1: Good token (should always work)
Write-Host "Test 1: Good app token" -ForegroundColor Yellow
Write-Host "URL: $Url/api/webhook?app=$APP_TOKEN&uid=$Uid" -ForegroundColor Gray

try {
  $response = Invoke-RestMethod -Uri "$Url/api/webhook?app=$APP_TOKEN&uid=$Uid" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $json `
    -UseBasicParsing
  
  Write-Host "✅ Success! Response: $response" -ForegroundColor Green
  Write-Host "   Check Discord for embed" -ForegroundColor Green
} catch {
  Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response: $responseBody" -ForegroundColor Red
  }
}
Write-Host ""

# Test 2: Bad token (should always fail)
Write-Host "Test 2: Bad app token" -ForegroundColor Yellow
Write-Host "URL: $Url/api/webhook?app=WRONG&uid=$Uid" -ForegroundColor Gray

try {
  $response = Invoke-RestMethod -Uri "$Url/api/webhook?app=WRONG&uid=$Uid" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $json `
    -UseBasicParsing
  
  Write-Host "⚠️ Unexpected success! Response: $response" -ForegroundColor Yellow
  Write-Host "   This should have been rejected!" -ForegroundColor Yellow
} catch {
  $expectedErrors = @("unauthorized", "401")
  $errorMatched = $false
  foreach ($err in $expectedErrors) {
    if ($_.Exception.Message -match $err) {
      $errorMatched = $true
      break
    }
  }
  
  if ($errorMatched) {
    Write-Host "✅ Correctly rejected! (401 Unauthorized)" -ForegroundColor Green
  } else {
    Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

# Test 3: No token (behavior depends on REQUIRE_APP_TOKEN)
Write-Host "Test 3: No app token" -ForegroundColor Yellow
Write-Host "URL: $Url/api/webhook?uid=$Uid" -ForegroundColor Gray
Write-Host "   If REQUIRE_APP_TOKEN=false: should succeed (backward compatible)" -ForegroundColor Gray
Write-Host "   If REQUIRE_APP_TOKEN=true: should fail (401 unauthorized)" -ForegroundColor Gray

try {
  $response = Invoke-RestMethod -Uri "$Url/api/webhook?uid=$Uid" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $json `
    -UseBasicParsing
  
  Write-Host "✅ Success! Response: $response" -ForegroundColor Green
  Write-Host "   REQUIRE_APP_TOKEN is likely FALSE (soft mode)" -ForegroundColor Cyan
} catch {
  $expectedErrors = @("unauthorized", "401")
  $errorMatched = $false
  foreach ($err in $expectedErrors) {
    if ($_.Exception.Message -match $err) {
      $errorMatched = $true
      break
    }
  }
  
  if ($errorMatched) {
    Write-Host "❌ Rejected (401 Unauthorized)" -ForegroundColor Yellow
    Write-Host "   REQUIRE_APP_TOKEN is likely TRUE (strict mode)" -ForegroundColor Cyan
  } else {
    Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
  }
}
Write-Host ""

Write-Host "Tests complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "--------" -ForegroundColor White
Write-Host "Test 1 (good token): Should always succeed ✅" -ForegroundColor White
Write-Host "Test 2 (bad token):  Should always fail ❌" -ForegroundColor White
Write-Host "Test 3 (no token):   Depends on REQUIRE_APP_TOKEN setting" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify Test 1 posted to Discord" -ForegroundColor White
Write-Host "2. Update Omi Webhook URL to include ?app=$APP_TOKEN" -ForegroundColor White
Write-Host "3. After confirming Omi calls work, set REQUIRE_APP_TOKEN=true" -ForegroundColor White
Write-Host "4. Redeploy: vercel --prod --force" -ForegroundColor White
