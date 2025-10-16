param(
  [Parameter(Mandatory=$true)][string]$Uid,
  [Parameter(Mandatory=$true)][string]$AdminKey,
  [string]$Url = "https://discomi-mvp-ochre.vercel.app"
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 Diagnostic Check for UID: $Uid" -ForegroundColor Cyan
Write-Host "URL: $Url/api/diag`n" -ForegroundColor Gray

try {
  $response = Invoke-RestMethod `
    -Uri "$Url/api/diag?uid=$([uri]::EscapeDataString($Uid))" `
    -Headers @{ "x-admin-key" = $AdminKey } `
    -Method Get `
    -TimeoutSec 30

  Write-Host "✅ Diagnostic Results:" -ForegroundColor Green
  Write-Host ""
  
  Write-Host "USE_SUPABASE: " -NoNewline -ForegroundColor Yellow
  Write-Host $response.USE_SUPABASE -ForegroundColor White
  
  Write-Host "Has Row: " -NoNewline -ForegroundColor Yellow
  Write-Host $response.hasRow -ForegroundColor White
  
  if ($response.error) {
    Write-Host "Error: " -NoNewline -ForegroundColor Red
    Write-Host $response.error -ForegroundColor White
  }
  
  if ($response.row) {
    Write-Host "`n📊 User Config:" -ForegroundColor Cyan
    Write-Host "  UID: $($response.row.uid)" -ForegroundColor White
    Write-Host "  Token Prefix: $($response.row.tokenPrefix)" -ForegroundColor White
    Write-Host "  Webhook URL: $($response.row.webhookUrl)" -ForegroundColor White
  }
  
  if ($response.expectedQueryExample) {
    Write-Host "`n🔗 Expected Webhook URL:" -ForegroundColor Cyan
    Write-Host "  $Url$($response.expectedQueryExample)" -ForegroundColor Green
    
    Write-Host "`n💡 To test the webhook directly, run:" -ForegroundColor Yellow
    Write-Host "  .\test-webhook-direct.ps1 -Token ""<full_token_from_supabase>"" -Uid ""$Uid""" -ForegroundColor Gray
  }
  
  if (!$response.USE_SUPABASE) {
    Write-Host "`n⚠️  WARNING: USE_SUPABASE is false!" -ForegroundColor Red
    Write-Host "   Set USE_SUPABASE=true in Vercel env vars and redeploy." -ForegroundColor Yellow
  }
  
  if (!$response.hasRow) {
    Write-Host "`n⚠️  WARNING: No user config found!" -ForegroundColor Red
    Write-Host "   Register this user first:" -ForegroundColor Yellow
    Write-Host "   POST $Url/api/register" -ForegroundColor Gray
    Write-Host "   Body: {""uid"":""$Uid"",""webhookUrl"":""<your_discord_webhook>""}" -ForegroundColor Gray
  }
}
catch {
  Write-Host "❌ Diagnostic Failed!" -ForegroundColor Red
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
  
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host "`n⚠️  Make sure ADMIN_API_KEY is set in Vercel and matches your input." -ForegroundColor Yellow
  }
}
