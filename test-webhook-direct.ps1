param(
  [Parameter(Mandatory=$true)][string]$Token,
  [Parameter(Mandatory=$true)][string]$Uid,
  [string]$Url = "https://discomi-mvp-ochre.vercel.app"
)

$ErrorActionPreference = "Stop"

# Ensure UTF-8 encoding for PowerShell requests
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Build webhook URL
$webhookUrl = "$Url/api/webhook?token=$([uri]::EscapeDataString($Token))&uid=$([uri]::EscapeDataString($Uid))"

Write-Host "Testing canonical webhook flow (bypasses Omi)" -ForegroundColor Cyan
Write-Host "URL: $webhookUrl`n" -ForegroundColor Gray

# Build test payload
$payload = @{
  created_at = (Get-Date).ToUniversalTime().ToString("o")
  structured = @{
    title    = "DiscOmi Self-Test"
    overview = "This payload bypasses Omi to prove the Supabase to Discord pipeline works."
    category = "idea"
  }
} | ConvertTo-Json -Depth 8

Write-Host "Payload:" -ForegroundColor Yellow
Write-Host $payload.Substring(0, [Math]::Min(150, $payload.Length)) "..." -ForegroundColor Gray
Write-Host ""

try {
  $response = Invoke-RestMethod `
    -Uri $webhookUrl `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $payload `
    -TimeoutSec 30 `
    -Verbose

  Write-Host "✅ Success!" -ForegroundColor Green
  Write-Host "Response: $response" -ForegroundColor White
  Write-Host "`nCheck your Discord channel for the embed." -ForegroundColor Cyan
}
catch {
  Write-Host "❌ Failed!" -ForegroundColor Red
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
  
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "Body: $body" -ForegroundColor Yellow
  }
}
