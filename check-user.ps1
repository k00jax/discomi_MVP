# Check how many users are in Supabase
$ErrorActionPreference = "Stop"

$UID="W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$ADMIN="o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"

Write-Host "`n=== Checking Supabase User Count ===" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Headers @{ "x-admin-key" = $ADMIN } -Uri "https://discomi-mvp-ochre.vercel.app/api/diag?uid=$UID"
    
    Write-Host "`nUser exists: $($response.hasRow)" -ForegroundColor $(if ($response.hasRow) { "Green" } else { "Red" })
    Write-Host "UID: $($response.row.uid)" -ForegroundColor Cyan
    Write-Host "Token prefix: $($response.row.tokenPrefix)" -ForegroundColor Cyan
    Write-Host "Webhook URL: $($response.row.webhookUrl)" -ForegroundColor Yellow
    
    Write-Host "`n=== Expected Webhook Query ===" -ForegroundColor Cyan
    Write-Host $response.expectedQueryExample -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
