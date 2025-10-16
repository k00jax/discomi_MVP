# Test script for Omi signature verification
# Usage: .\test-omi-signature.ps1 -Uid "your-uid" [-Token "your-token"] [-SigningSecret "your-secret"]

param(
  [Parameter(Mandatory=$true)]
  [string]$Uid,
  
  [Parameter(Mandatory=$false)]
  [string]$Token = "",
  
  [Parameter(Mandatory=$false)]
  [string]$SigningSecret = "",
  
  [Parameter(Mandatory=$false)]
  [string]$Url = "https://discomi-mvp-ochre.vercel.app/api/webhook"
)

$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "DiscOmi Signature Test" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Test payload (Omi format)
$payload = @{
  id = "test_$(Get-Random)"
  uid = $Uid
  created_at = (Get-Date -Format "o")
  structured = @{
    title = "Test Memory"
    overview = "This is a test from PowerShell to verify Omi signature authentication works correctly."
    category = "idea"
  }
  transcript_segments = @(
    @{ text = "This is a test memory." }
    @{ text = "Testing signature verification." }
  )
}

$json = $payload | ConvertTo-Json -Depth 10 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

# Test 1: With Omi signature (if secret provided)
if ($SigningSecret) {
  Write-Host "Test 1: Omi-signed request (no token needed)" -ForegroundColor Yellow
  Write-Host "URL: $Url`?uid=$Uid" -ForegroundColor Gray
  
  # Create HMAC-SHA256 signature
  $hmac = New-Object System.Security.Cryptography.HMACSHA256
  $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($SigningSecret)
  $signature = -join ($hmac.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })
  
  Write-Host "Signature: $($signature.Substring(0, 16))..." -ForegroundColor Gray
  
  try {
    $response = Invoke-WebRequest -Uri "$Url`?uid=$Uid" `
      -Method POST `
      -Headers @{
        "Content-Type" = "application/json"
        "x-omi-signature" = $signature
      } `
      -Body $json `
      -UseBasicParsing
    
    Write-Host "✅ Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
  } catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $responseBody = $reader.ReadToEnd()
      Write-Host "Response: $responseBody" -ForegroundColor Red
    }
  }
  Write-Host ""
}

# Test 2: With token (no signature)
if ($Token) {
  Write-Host "Test 2: Token-based request (manual testing)" -ForegroundColor Yellow
  Write-Host "URL: $Url`?uid=$Uid&token=$Token" -ForegroundColor Gray
  
  try {
    $response = Invoke-WebRequest -Uri "$Url`?uid=$Uid&token=$Token" `
      -Method POST `
      -Headers @{ "Content-Type" = "application/json" } `
      -Body $json `
      -UseBasicParsing
    
    Write-Host "✅ Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
  } catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $responseBody = $reader.ReadToEnd()
      Write-Host "Response: $responseBody" -ForegroundColor Red
    }
  }
  Write-Host ""
}

# Test 3: No auth (should fail)
Write-Host "Test 3: No authentication (should fail)" -ForegroundColor Yellow
Write-Host "URL: $Url`?uid=$Uid" -ForegroundColor Gray

try {
  $response = Invoke-WebRequest -Uri "$Url`?uid=$Uid" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $json `
    -UseBasicParsing
  
  Write-Host "⚠️ Unexpected success! Status: $($response.StatusCode)" -ForegroundColor Yellow
  Write-Host "Response: $($response.Content)" -ForegroundColor Yellow
} catch {
  $expectedErrors = @("unauthorized", "invalid_signature", "401")
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
Write-Host "Tests complete!" -ForegroundColor Cyan
