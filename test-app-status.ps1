# Test script for app-status diagnostic endpoint
# Usage: .\test-app-status.ps1 [-AdminKey "your-admin-key"] [-AppToken "app-token"] [-Url "base-url"]

param(
  [Parameter(Mandatory=$false)]
  [string]$AdminKey = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg",
  
  [Parameter(Mandatory=$false)]
  [string]$AppToken = "",
  
  [Parameter(Mandatory=$false)]
  [string]$Url = "https://discomi-mvp-ochre.vercel.app"
)

$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "DiscOmi App Token Status Check" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Build URL
$uri = "$Url/api/app-status"
if ($AppToken) {
  $uri += "?app=$([uri]::EscapeDataString($AppToken))"
}

Write-Host "URL: $uri" -ForegroundColor Gray
Write-Host ""

try {
  $response = Invoke-RestMethod -Uri $uri `
    -Method GET `
    -Headers @{ "x-admin-key" = $AdminKey } `
    -UseBasicParsing
  
  Write-Host "✅ Response:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 10 | Write-Host
  
  Write-Host ""
  Write-Host "Quick Summary:" -ForegroundColor Cyan
  Write-Host "-------------" -ForegroundColor White
  Write-Host "Require App Token: $($response.config.requireApp)" -ForegroundColor $(if ($response.config.requireApp) { "Yellow" } else { "Green" })
  Write-Host "App Env Set: $($response.config.hasAppEnv)" -ForegroundColor $(if ($response.config.hasAppEnv) { "Green" } else { "Yellow" })
  Write-Host "Will Accept Request: $($response.interpretation.willAccept)" -ForegroundColor $(if ($response.interpretation.willAccept) { "Green" } else { "Red" })
  Write-Host "Reason: $($response.interpretation.reason)" -ForegroundColor White
  
  if ($response.nextSteps) {
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    foreach ($step in $response.nextSteps) {
      Write-Host "  • $step" -ForegroundColor White
    }
  }
  
} catch {
  Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Red
  }
}
